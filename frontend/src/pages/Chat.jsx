import React, { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { io } from 'socket.io-client';
import apiClient from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import Button from '../components/Button';
import Input from '../components/Input';
import { Send, User, Clock, Check, MessageSquare, Image, Smile } from 'lucide-react';

const Chat = () => {
  const { user } = useSelector((state) => state.auth);
  
  // State
  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [onlineUserIds, setOnlineUserIds] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  
  // Refs
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Auto-scroll helper
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, otherUserTyping]);

  // 1. Fetch Contacts list based on user role (Client vs Freelancer)
  useEffect(() => {
    const fetchContacts = async () => {
      setLoadingContacts(true);
      try {
        const contactMap = new Map();

        if (user.role === 'Client') {
          // Fetch Client's gigs
          const gigsResponse = await apiClient.get('/gigs/me');
          const gigs = gigsResponse.data || [];
          
          // For each gig, fetch proposals to get the freelancer details
          for (const gig of gigs) {
            const proposalsResponse = await apiClient.get(`/proposals/gig/${gig._id}`);
            const proposals = proposalsResponse.data || [];
            
            proposals.forEach((prop) => {
              if (prop.freelancer) {
                contactMap.set(prop.freelancer._id, {
                  _id: prop.freelancer._id,
                  name: prop.freelancer.name,
                  email: prop.freelancer.email,
                  avatar: prop.freelancer.avatar,
                  role: 'Freelancer',
                  gigTitle: gig.title,
                });
              }
            });
          }
        } else if (user.role === 'Freelancer') {
          // Fetch Freelancer's proposals
          const proposalsResponse = await apiClient.get('/proposals/me');
          const proposals = proposalsResponse.data || [];
          
          proposals.forEach((prop) => {
            if (prop.gig && prop.gig.client) {
              // Note: client in gig is populated or has client details
              const client = prop.gig.client;
              // If client is a string (only ID), fallback to generic info, or if populated, use details
              const clientId = typeof client === 'object' ? client._id : client;
              
              contactMap.set(clientId, {
                _id: clientId,
                name: typeof client === 'object' ? client.name : 'Client Partner',
                email: typeof client === 'object' ? client.email : '',
                avatar: typeof client === 'object' ? client.avatar : '',
                role: 'Client',
                gigTitle: prop.gig.title,
              });
            }
          });
        }

        setContacts(Array.from(contactMap.values()));
      } catch (err) {
        console.error('Failed to load contacts:', err);
      } finally {
        setLoadingContacts(false);
      }
    };

    if (user) fetchContacts();
  }, [user]);

  // 2. Initialize Socket.IO connection
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    // Connect to backend socket server
    socketRef.current = io('http://localhost:5000', {
      auth: { token },
      transports: ['websocket'],
    });

    // Handle online status updates
    socketRef.current.on('online_users', (userIds) => {
      setOnlineUserIds(userIds);
    });

    // Handle incoming messages
    socketRef.current.on('receive_message', (message) => {
      // If the message is from our currently selected contact, add it to chat history
      if (selectedContact && message.sender._id === selectedContact._id) {
        setMessages((prev) => [...prev, message]);
        // Mark message as read
        socketRef.current.emit('read_messages', { senderId: selectedContact._id });
      }
    });

    // Handle typing indicator updates
    socketRef.current.on('typing_status', (data) => {
      if (selectedContact && data.senderId === selectedContact._id) {
        setOtherUserTyping(data.isTyping);
      }
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [selectedContact]);

  // 3. Fetch message history when selected contact changes
  useEffect(() => {
    const fetchHistory = async () => {
      if (!selectedContact) return;
      setLoadingMessages(true);
      setMessages([]);
      setOtherUserTyping(false);
      try {
        const response = await apiClient.get(`/chat/history/${selectedContact._id}`);
        if (response.success) {
          setMessages(response.data.messages || []);
        }
        // Emit read receipt for this contact
        if (socketRef.current) {
          socketRef.current.emit('read_messages', { senderId: selectedContact._id });
        }
      } catch (err) {
        console.error('Failed to load chat history:', err);
      } finally {
        setLoadingMessages(false);
      }
    };

    fetchHistory();
  }, [selectedContact]);

  // 4. Typing indicator handler
  const handleInputChange = (e) => {
    setNewMessage(e.target.value);

    if (socketRef.current && selectedContact) {
      if (!isTyping) {
        setIsTyping(true);
        socketRef.current.emit('typing', { receiverId: selectedContact._id, isTyping: true });
      }

      // Clear previous timeout and set new one to stop typing indicator after 2s of inactivity
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        socketRef.current.emit('typing', { receiverId: selectedContact._id, isTyping: false });
      }, 2000);
    }
  };

  // 5. Send message handler
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedContact || !socketRef.current) return;

    const messagePayload = {
      receiverId: selectedContact._id,
      content: newMessage,
      attachments: [],
    };

    // Emit send_message event
    socketRef.current.emit('send_message', messagePayload, (status) => {
      if (status.success) {
        setMessages((prev) => [...prev, status.message]);
        setNewMessage('');
        // Stop typing indicator instantly
        setIsTyping(false);
        socketRef.current.emit('typing', { receiverId: selectedContact._id, isTyping: false });
      } else {
        console.error('Failed to dispatch message:', status.error);
      }
    });
  };

  const isContactOnline = (contactId) => onlineUserIds.includes(contactId);

  return (
    <div className="flex h-[calc(100vh-8rem)] glass-panel border border-glassBorder rounded-3xl overflow-hidden animate-fade-in">
      {/* Left Panel: Contacts */}
      <div className="w-80 border-r border-glassBorder flex flex-col bg-white/2 bg-opacity-5">
        <div className="p-5 border-b border-glassBorder bg-white/2">
          <h2 className="text-md font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-blue-400" /> Active Chats
          </h2>
          <p className="text-2xs text-gray-500 mt-1 uppercase tracking-widest font-semibold">{contacts.length} conversations</p>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-white/5">
          {loadingContacts && <LoadingSpinner size="small" className="py-12" />}

          {!loadingContacts && contacts.length === 0 && (
            <div className="p-8 text-center text-gray-500 text-xs">
              No chat connections found yet. Submit or review active proposals to connect!
            </div>
          )}

          {!loadingContacts &&
            contacts.map((contact) => {
              const isOnline = isContactOnline(contact._id);
              const isSelected = selectedContact?._id === contact._id;
              return (
                <button
                  key={contact._id}
                  onClick={() => setSelectedContact(contact)}
                  className={`w-full p-4 flex items-center space-x-3 transition-all text-left cursor-pointer ${
                    isSelected ? 'bg-blue-600/25 border-l-4 border-blue-500' : 'hover:bg-white/5 border-l-4 border-transparent'
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shadow-md">
                      {contact.name.charAt(0).toUpperCase()}
                    </div>
                    {isOnline && (
                      <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-darkBg" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white truncate">{contact.name}</span>
                      <span className="text-3xs uppercase tracking-wider text-gray-500 font-extrabold">{contact.role}</span>
                    </div>
                    <span className="text-3xs text-gray-400 block truncate mt-0.5 font-medium">Gig: {contact.gigTitle}</span>
                  </div>
                </button>
              );
            })}
        </div>
      </div>

      {/* Right Panel: Chat Area */}
      <div className="flex-1 flex flex-col bg-black/10">
        {selectedContact ? (
          <>
            {/* Chat Header */}
            <div className="h-16 border-b border-glassBorder px-6 flex items-center justify-between bg-white/2 bg-opacity-5">
              <div className="flex items-center space-x-3 min-w-0">
                <div className="relative">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                    {selectedContact.name.charAt(0).toUpperCase()}
                  </div>
                  {isContactOnline(selectedContact._id) && (
                    <span className="absolute bottom-0 right-0 block h-2 w-2 rounded-full bg-emerald-500 ring-1 ring-darkBg" />
                  )}
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-white block leading-tight">{selectedContact.name}</span>
                  <span className="text-3xs text-gray-500 block uppercase tracking-wider font-extrabold mt-0.5">
                    {isContactOnline(selectedContact._id) ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {loadingMessages && <LoadingSpinner size="small" className="py-8" />}

              {!loadingMessages &&
                messages.map((msg) => {
                  const isSelf = msg.sender._id === user._id;
                  const dateStr = new Date(msg.createdAt).toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                  return (
                    <div key={msg._id} className={`flex ${isSelf ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                      <div className="max-w-[70%] space-y-1">
                        <div
                          className={`p-3.5 rounded-2xl text-xs font-medium ${
                            isSelf
                              ? 'bg-blue-600 text-white rounded-tr-none'
                              : 'bg-white/10 text-gray-100 border border-white/5 rounded-tl-none'
                          }`}
                        >
                          {msg.content}
                        </div>
                        <div className={`flex items-center space-x-1 text-3xs text-gray-500 ${isSelf ? 'justify-end' : 'justify-start'}`}>
                          <span>{dateStr}</span>
                          {isSelf && <Check className="h-3 w-3 text-blue-400" />}
                        </div>
                      </div>
                    </div>
                  );
                })}

              {/* Typing indicator bubble */}
              {otherUserTyping && (
                <div className="flex justify-start animate-pulse">
                  <div className="bg-white/10 text-gray-400 border border-white/5 px-4 py-2 rounded-2xl rounded-tl-none text-2xs font-bold flex items-center space-x-1">
                    <span>{selectedContact.name} is typing</span>
                    <span className="animate-bounce">.</span>
                    <span className="animate-bounce delay-100">.</span>
                    <span className="animate-bounce delay-200">.</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-glassBorder bg-white/2 bg-opacity-5 flex items-center space-x-3">
              <input
                type="text"
                value={newMessage}
                onChange={handleInputChange}
                placeholder={`Send message to ${selectedContact.name}...`}
                className="flex-grow px-4 py-3 rounded-xl text-sm glass-input placeholder-gray-500 font-medium transition-all"
              />
              <Button type="submit" variant="primary" className="py-3 px-4 rounded-xl flex items-center justify-center">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </>
        ) : (
          <div className="flex-grow flex flex-col items-center justify-center p-12 text-center text-gray-500">
            <MessageSquare className="h-12 w-12 text-gray-600 mb-3" />
            <h3 className="text-md font-bold text-white mb-1">Your Inbox</h3>
            <p className="text-xs max-w-sm">Select a contact from the active list to retrieve history and begin real-time messaging.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
