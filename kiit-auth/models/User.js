// @ts-check

import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    googleSub: {
      type: String,
      required: true,
      unique: true
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      index: true
    },

    name: {
      type: String,
      default: ''
    },

    picture: {
      type: String,
      default: ''
    },

    apiKeyHash: {
      type: String,
      required: true,
      unique: true
    },

    apiKeyPrefix: {
      type: String,
      required: true
    },

    keyCreatedAt: {
      type: Date,
      required: true
    },

    keyRotatedCount: {
      type: Number,
      default: 0
    },

    lastLoginAt: {
      type: Date,
      required: true
    }
  },
  {
    timestamps: true
  }
);

const User = mongoose.model('User', userSchema);

export default User;
