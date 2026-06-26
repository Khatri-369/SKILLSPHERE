import Razorpay from 'razorpay';
import crypto from 'crypto';
import config from '../config/index.js';
import Payment from '../models/payment.model.js';
import Gig from '../models/gig.model.js';

// Detect if live Razorpay keys are configured
const isRazorpayConfigured =
  config.razorpay.keyId &&
  config.razorpay.keyId !== 'your_razorpay_key_id' &&
  config.razorpay.keySecret &&
  config.razorpay.keySecret !== 'your_razorpay_key_secret';

let razorpayInstance;
if (isRazorpayConfigured) {
  razorpayInstance = new Razorpay({
    key_id: config.razorpay.keyId,
    key_secret: config.razorpay.keySecret,
  });
}

/**
 * Create a Razorpay Order for a specific Gig Milestone
 * POST /api/v1/payments/order
 */
export const createMilestoneOrder = async (req, res, next) => {
  try {
    const { gigId, milestoneId, recipientId } = req.body;
    const clientId = req.user._id;

    if (!gigId || !milestoneId || !recipientId) {
      const error = new Error('Gig ID, Milestone ID, and Recipient ID are required');
      error.statusCode = 400;
      return next(error);
    }

    // 1. Fetch Gig and verify client ownership
    const gig = await Gig.findById(gigId);
    if (!gig) {
      const error = new Error('Gig not found');
      error.statusCode = 404;
      return next(error);
    }

    if (gig.client.toString() !== clientId.toString()) {
      const error = new Error('Access denied. You do not own this gig.');
      error.statusCode = 403;
      return next(error);
    }

    // 2. Fetch target milestone
    const milestone = gig.milestones.id(milestoneId);
    if (!milestone) {
      const error = new Error('Milestone not found in this gig');
      error.statusCode = 404;
      return next(error);
    }

    // 3. Prevent duplicate payments on the same milestone if already paid/pending
    const existingPayment = await Payment.findOne({
      gig: gigId,
      milestoneId,
      status: { $in: ['Paid', 'Pending'] },
    });

    if (existingPayment) {
      if (existingPayment.status === 'Paid') {
        const error = new Error('Milestone is already paid');
        error.statusCode = 400;
        return next(error);
      }
      // If it is pending, return existing order to avoid double orders
      return res.status(200).json({
        success: true,
        message: 'Pending payment order already exists for this milestone',
        data: existingPayment,
      });
    }

    // 4. Create Order in Razorpay
    let orderId;
    const amountInPaise = Math.round(milestone.amount * 100);

    if (isRazorpayConfigured) {
      const razorpayOrder = await razorpayInstance.orders.create({
        amount: amountInPaise,
        currency: 'INR',
        receipt: milestoneId.toString(),
      });
      orderId = razorpayOrder.id;
    } else {
      // Mock Fallback
      orderId = `order_mock_${Date.now()}_${Math.round(Math.random() * 1e5)}`;
      console.log(`💳 [MOCK RAZORPAY ORDER] Created Order: ${orderId} for Milestone ${milestoneId}`);
    }

    // 5. Create Pending Payment in database
    const payment = await Payment.create({
      sender: clientId,
      recipient: recipientId,
      gig: gigId,
      milestoneId,
      amount: milestone.amount,
      currency: 'INR',
      razorpayOrderId: orderId,
      status: 'Pending',
    });

    return res.status(201).json({
      success: true,
      message: 'Payment order created successfully',
      data: payment,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify Razorpay Payment Signature
 * POST /api/v1/payments/verify
 */
export const verifyPaymentSignature = async (req, res, next) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    if (!razorpayOrderId || !razorpayPaymentId) {
      const error = new Error('Razorpay Order ID and Payment ID are required');
      error.statusCode = 400;
      return next(error);
    }

    // 1. Fetch pending payment
    const payment = await Payment.findOne({ razorpayOrderId });
    if (!payment) {
      const error = new Error('Payment transaction order not found');
      error.statusCode = 404;
      return next(error);
    }

    if (payment.status === 'Paid') {
      return res.status(200).json({
        success: true,
        message: 'Payment is already verified and marked as Paid',
        data: payment,
      });
    }

    // 2. Perform signature validation
    if (isRazorpayConfigured) {
      if (!razorpaySignature) {
        const error = new Error('Razorpay signature is required for verification');
        error.statusCode = 400;
        return next(error);
      }

      const generatedSignature = crypto
        .createHmac('sha256', config.razorpay.keySecret)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest('hex');

      if (generatedSignature !== razorpaySignature) {
        const error = new Error('Payment signature verification failed. Untrusted transaction.');
        error.statusCode = 400;
        return next(error);
      }
    } else {
      console.log(`💳 [MOCK RAZORPAY SIGNATURE VERIFICATION] Verifying Order ${razorpayOrderId}`);
    }

    // 3. Mark transaction as Paid
    payment.status = 'Paid';
    payment.razorpayPaymentId = razorpayPaymentId;
    payment.razorpaySignature = razorpaySignature || 'mock_sig_123';
    await payment.save();

    return res.status(200).json({
      success: true,
      message: 'Payment verified and marked as Paid successfully',
      data: payment,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Process Refund for a Milestone Payment
 * POST /api/v1/payments/:paymentId/refund
 */
export const refundPayment = async (req, res, next) => {
  try {
    const { paymentId } = req.params;
    const { reason } = req.body;
    const userId = req.user._id;

    // 1. Find transaction
    const payment = await Payment.findById(paymentId);
    if (!payment) {
      const error = new Error('Payment transaction not found');
      error.statusCode = 404;
      return next(error);
    }

    // 2. Verify authorization (Only Client owner or Admin can refund)
    const isClientSender = payment.sender.toString() === userId.toString();
    if (!isClientSender && req.user.role !== 'Admin') {
      const error = new Error('Access denied. Only the client or an admin can refund this payment.');
      error.statusCode = 403;
      return next(error);
    }

    if (payment.status !== 'Paid') {
      const error = new Error(`Cannot refund payment with status: ${payment.status}. Must be Paid.`);
      error.statusCode = 400;
      return next(error);
    }

    // 3. Invoke Razorpay Refund API
    let refundId;
    if (isRazorpayConfigured) {
      const refundResponse = await razorpayInstance.payments.refund(payment.razorpayPaymentId, {
        amount: Math.round(payment.amount * 100),
        notes: { reason: reason || 'Requested by client' },
      });
      refundId = refundResponse.id;
    } else {
      // Mock Fallback
      refundId = `refund_mock_${Date.now()}`;
      console.log(`💳 [MOCK RAZORPAY REFUND] Refunded Payment ${payment.razorpayPaymentId}: ${refundId}`);
    }

    // 4. Update status in database
    payment.status = 'Refunded';
    payment.refundId = refundId;
    payment.refundReason = reason || 'Requested by client';
    await payment.save();

    return res.status(200).json({
      success: true,
      message: 'Payment refunded successfully',
      data: payment,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Fetch Payment History (Transactions list)
 * GET /api/v1/payments/history
 */
export const getPaymentHistory = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 15;
    const skip = (page - 1) * limit;

    // Query transactions where user is sender or recipient
    const query = { $or: [{ sender: userId }, { recipient: userId }] };

    const payments = await Payment.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('sender', 'name email avatar')
      .populate('recipient', 'name email avatar')
      .populate('gig', 'title category');

    const total = await Payment.countDocuments(query);

    return res.status(200).json({
      success: true,
      message: 'Payment history retrieved successfully',
      data: {
        payments,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Razorpay Webhook Verification
 * POST /api/v1/payments/webhook
 */
export const handleWebhook = async (req, res, next) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const secret = config.razorpay.webhookSecret;

    // Cryptographic validation if secret is set and not a placeholder
    const isWebhookVerifyEnabled = secret && secret !== 'your_razorpay_webhook_secret';

    if (isWebhookVerifyEnabled) {
      if (!signature) {
        return res.status(400).send('x-razorpay-signature header is missing');
      }

      // Compute HMAC SHA256 signature using raw body buffer
      const rawBody = req.rawBody || JSON.stringify(req.body);
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(rawBody)
        .digest('hex');

      if (expectedSignature !== signature) {
        console.warn('⚠️ [RAZORPAY WEBHOOK] Cryptographic signature check failed!');
        return res.status(400).send('Signature verification failed');
      }
    } else {
      console.log('💳 [MOCK RAZORPAY WEBHOOK] Receiving webhook payload (signature verification skipped)...');
    }

    const { event, payload } = req.body;
    if (!event || !payload) {
      return res.status(400).send('Invalid webhook structure');
    }

    const orderId = payload.payment?.entity?.order_id;
    const paymentId = payload.payment?.entity?.id;

    if (!orderId) {
      return res.status(200).send('Webhook processed (no order reference found)');
    }

    const payment = await Payment.findOne({ razorpayOrderId: orderId });
    if (!payment) {
      return res.status(200).send('Webhook order not found in platform database');
    }

    if (event === 'payment.captured') {
      if (payment.status !== 'Paid') {
        payment.status = 'Paid';
        payment.razorpayPaymentId = paymentId;
        await payment.save();
        console.log(`🔔 [RAZORPAY WEBHOOK] Payment Order ${orderId} successfully captured and marked Paid.`);
      }
    } else if (event === 'payment.failed') {
      payment.status = 'Failed';
      await payment.save();
      console.log(`🔔 [RAZORPAY WEBHOOK] Payment Order ${orderId} failed.`);
    }

    return res.status(200).send('Webhook completed successfully');
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).send('Internal Server Webhook Error');
  }
};
