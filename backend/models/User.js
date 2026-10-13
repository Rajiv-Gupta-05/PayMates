const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name']
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    minlength: 6,
    default: null
  },
  googleId: {
    type: String,
    default: null
  },
  default_currency: {
    type: String,
    default: 'INR'
  },
  phone: {
    type: String,
    default: ''
  },
  avatar: {
    type: String,
    default: ''
  },
  friends: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User' // This tells Mongoose these IDs belong to other Users
    }
  ]
}, { timestamps: true });

// Pre-save hook: Hash the password before saving to the database
userSchema.pre('save', async function () {
  // Skip hashing if no password (Google OAuth users) or password not modified
  if (!this.password || !this.isModified('password')) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Method to compare the entered password with the hashed password in the database.
// Returns false (never throws) when no password is set (e.g. Google SSO accounts).
userSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password) return false; // Google-only account — no password stored
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);