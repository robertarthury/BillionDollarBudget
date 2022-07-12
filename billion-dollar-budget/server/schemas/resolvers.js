const { AuthenticationError } = require("apollo-server-express");
const { User, Assets, Liabilities } = require("../models");
const { signToken } = require('../utils/auth');

const resolvers = {
  Query: {
    assets: async (parent, { username }) => {
      const params = username ? { username } : {};
      return Assets.find(params).sort({ createdAt: -1 });
    },
    liabilities: async (parent, { username }) => {
      const params = username ? { username } : {};
      return Liabilities.find(params).sort({ createdAt: -1 });
    },
    me: async (parent, args, context) => {
      if (context.user) {
        const userData = await User.findOne({ _id: context.user._id })
          .select('-__v -password')
          .populate("assets")
          .populate("liabilities");   
        return userData;
      }
    
      throw new AuthenticationError('Not logged in');
    },
    // get all users
    users: async () => {
      return User.find()
        .select("-__v -password")
        .populate("assets")
        .populate("liabilities");
    },

    // get a user by username
    user: async (parent, { username }) => {
      return User.findOne({ username })
        .select("-__v -password")
        .populate("assets")
        .populate("liabilities");
    },
  },
  Mutation: {
    addUser: async (parent, args) => {
      const user = await User.create(args);
      const token = signToken(user);    
      return { token, user };
    },
    login: async (parent, { email, password }) => {
      const user = await User.findOne({ email });   
      if (!user) {
        throw new AuthenticationError('Incorrect credentials');
      }   
      const correctPw = await user.isCorrectPassword(password);   
      if (!correctPw) {
        throw new AuthenticationError('Incorrect credentials');
      }   
      const token = signToken(user);
      return { token, user };
    },
    addAssets: async (parent, {username,salary}, context) => {
      if (context.user) {
        const assets = await Assets.create({username: context.user.username,salary: salary});
    
        await User.findByIdAndUpdate(
          { _id: context.user._id },
          { $push: { assets: assets._id} },
          { new: true }
        );
    
        return assets;
      }
    
      throw new AuthenticationError('You need to be logged in!');
    }
  }
};

module.exports = resolvers;
