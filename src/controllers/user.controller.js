import User from '../models/user.model.js';
import { uploadToCloudinary } from '../utils/cloudinary.js';

/**
 * Update User Profile Details
 * PATCH /api/v1/users/profile
 */
export const updateUserProfile = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // 1. Fetch user from database
    const user = await User.findById(userId);
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      return next(error);
    }

    // 2. Parse and update basic text fields
    const { bio, location, phone, portfolio } = req.body;
    if (bio !== undefined) user.bio = bio;
    if (location !== undefined) user.location = location;
    if (phone !== undefined) user.phone = phone;
    if (portfolio !== undefined) user.portfolio = portfolio;

    // 3. Handle parsing of skills array (sent as string list or JSON array)
    if (req.body.skills !== undefined) {
      const skillsInput = req.body.skills;
      if (typeof skillsInput === 'string') {
        try {
          user.skills = JSON.parse(skillsInput);
        } catch (e) {
          // If it is a comma-separated list
          user.skills = skillsInput.split(',').map((skill) => skill.trim()).filter(Boolean);
        }
      } else if (Array.isArray(skillsInput)) {
        user.skills = skillsInput;
      }
    }

    // 4. Handle parsing of experience list (sent as JSON string)
    if (req.body.experience !== undefined) {
      const expInput = req.body.experience;
      try {
        user.experience = typeof expInput === 'string' ? JSON.parse(expInput) : expInput;
      } catch (e) {
        const error = new Error('Invalid experience format. Must be a valid JSON array.');
        error.statusCode = 400;
        return next(error);
      }
    }

    // 5. Handle parsing of education list (sent as JSON string)
    if (req.body.education !== undefined) {
      const eduInput = req.body.education;
      try {
        user.education = typeof eduInput === 'string' ? JSON.parse(eduInput) : eduInput;
      } catch (e) {
        const error = new Error('Invalid education format. Must be a valid JSON array.');
        error.statusCode = 400;
        return next(error);
      }
    }

    // 6. Handle Avatar File Upload via Cloudinary (with compression, auto-format, and crop resizing)
    if (req.files?.avatar?.[0]) {
      const avatarLocalPath = req.files.avatar[0].path;
      const cloudinaryResponse = await uploadToCloudinary(avatarLocalPath, {
        folder: 'avatars',
        transformation: [
          { width: 250, height: 250, crop: 'fill', gravity: 'face' },
          { quality: 'auto', fetch_format: 'auto' },
        ],
      });
      if (cloudinaryResponse?.secure_url) {
        user.avatar = cloudinaryResponse.secure_url;
      }
    }

    // 7. Handle Resume File Upload via Cloudinary
    if (req.files?.resume?.[0]) {
      const resumeLocalPath = req.files.resume[0].path;
      const cloudinaryResponse = await uploadToCloudinary(resumeLocalPath);
      if (cloudinaryResponse?.secure_url) {
        user.resume = cloudinaryResponse.secure_url;
      }
    }

    // 8. Save updated details to database
    await user.save();

    // 9. Query clean representation of updated user
    const updatedUser = await User.findById(userId).select(
      '-password -refreshToken -emailVerificationToken -emailVerificationExpiry -forgotPasswordToken -forgotPasswordExpiry'
    );

    // 10. Return standardized response
    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};
