import { v2 as cloudinary } from "cloudinary";
import { catchAsyncErrors } from "../middlewares/catchAsyncErrors.js";
import { User } from "../models/userSchema.js";
import ErrorHandler from "../middlewares/error.js";
import { generateToken } from "../utils/jwtToken.js";
import { sendEmail } from "../utils/sendEmail.js";
import crypto from "crypto";

export const register = catchAsyncErrors(async (req, res, next) => {
  if (!req.files || Object.keys(req.files).length === 0) {
    return next(new ErrorHandler("Avatar and Resume are Required!", 400));
  }
  const { avatar, resume } = req.files;

  //POSTING AVATAR
  const cloudinaryResponseForAvatar = await cloudinary.uploader.upload(
    avatar.tempFilePath,
    { folder: "AVATARS" }
  );
  if (!cloudinaryResponseForAvatar || cloudinaryResponseForAvatar.error) {
    console.error(
      "Cloudinary Error:",
      cloudinaryResponseForAvatar.error || "Unknown Cloudinary error"
    );
    return next(new ErrorHandler("Failed to upload avatar to Cloudinary", 500));
  }

  //POSTING RESUME
  const cloudinaryResponseForResume = await cloudinary.uploader.upload(
    resume.tempFilePath,
    { folder: "MY_RESUME" }
  );
  if (!cloudinaryResponseForResume || cloudinaryResponseForResume.error) {
    console.error(
      "Cloudinary Error:",
      cloudinaryResponseForResume.error || "Unknown Cloudinary error"
    );
    return next(new ErrorHandler("Failed to upload resume to Cloudinary", 500));
  }
  const {
    fullName,
    email,
    phone,
    aboutMe,
    password,
    portfolioURL,
    githubURL,
    instagramURL,
    xURL,
    facebookURL,
    linkedInURL,
  } = req.body;
  const user = await User.create({
    fullName,
    email,
    phone,
    aboutMe,
    password,
    portfolioURL,
    githubURL,
    instagramURL,
    xURL,
    facebookURL,
    linkedInURL,
    avatar: {
      public_id: cloudinaryResponseForAvatar.public_id, // Set your cloudinary public_id here
      url: cloudinaryResponseForAvatar.secure_url, // Set your cloudinary secure_url here
    },
    resume: {
      public_id: cloudinaryResponseForResume.public_id, // Set your cloudinary public_id here
      url: cloudinaryResponseForResume.secure_url, // Set your cloudinary secure_url here
    },
  });
  generateToken(user, "User Registered Successfully", 201, res);
});

export const login = catchAsyncErrors(async(req, res, next)=>{
    const { email, password } = req.body;
    if( !email || !password ){
        return next (new ErrorHandler("Email and Password are Required "));
    }
    const user = await User.findOne({ email }).select("+password");
    if(!user){
        return next (new ErrorHandler("Invalid Email or Password Entered"))
    }
    const isPasswordMatched = await user.comparePassword(password);
    if(!isPasswordMatched){
        return next (new ErrorHandler("Incorrect Password"));
    }
      const fullUser = await User.findById(user._id);
      generateToken(fullUser, "Logged In Successfully!", 200, res);
});

export const logout = catchAsyncErrors(async(req, res, next)=>{
    res.status(200).cookie("token","",{
        expires: new Date(Date.now()),
        httpOnly:true,
    }).json({
        success:true,
    })
});

export const getUser = catchAsyncErrors(async(req, res, next)=>{
    const user = await User.findById(req.user._id);
    res.status(200).json({
        success:true,
        user,
    });
});

export const updateProfile = catchAsyncErrors(async (req, res, next) => {
    const newUserData = {
      fullName: req.body.fullName,
      email: req.body.email,
      phone: req.body.phone,
      aboutMe: req.body.aboutMe,
      githubURL: req.body.githubURL,
      instagramURL: req.body.instagramURL,
      portfolioURL: req.body.portfolioURL,
      facebookURL: req.body.facebookURL,
      xURL: req.body.xURL,
      linkedInURL: req.body.linkedInURL,
    };
    if (req.files && req.files.avatar) {
      const avatar = req.files.avatar;
      const user = await User.findById(req.user.id);
      const profileImageId = user.avatar.public_id;
      await cloudinary.uploader.destroy(profileImageId);
      const cloudinaryResponse = await cloudinary.uploader.upload(
        avatar.tempFilePath,
        {
          folder: "AVATARS",
        }
      );
      newUserData.avatar = {
        public_id: cloudinaryResponse.public_id,
        url: cloudinaryResponse.secure_url,
      };
    }
  
    if (req.files && req.files.resume) {
      const resume = req.files.resume;
      const user = await User.findById(req.user.id);
      const resumeId = user.resume.public_id;
      await cloudinary.uploader.destroy(resumeId);
      const cloudinaryResponse = await cloudinary.uploader.upload(
        resume.tempFilePath, 
        {folder: "MY_RESUME"}
    );
      newUserData.resume = {
        public_id: cloudinaryResponse.public_id,
        url: cloudinaryResponse.secure_url,
      };
    }
    const user = await User.findByIdAndUpdate(req.user.id, newUserData, {
      new: true,
      runValidators: true,
      useFindAndModify: false,
    });
    res.status(200).json({
      success: true,
      message: "Profile Updated!",
      user,
    });
  });


  export const updatePassword = catchAsyncErrors(async(req, res, next)=>{
    const { currentPassword, newPassword, confirmNewPassword } = req.body;
    if(!currentPassword || !newPassword || !confirmNewPassword){
        return next(new ErrorHandler("Please Fill All Fields.!",400));
    }
    const user = await User.findById(req.user.id).select("password");
    const isPasswordMatched = await user.comparePassword(currentPassword);
    if(!isPasswordMatched){
        return next(new ErrorHandler("Current Password Is Incorrect!", 400));
    }
    if(newPassword !== confirmNewPassword){
        return next(new ErrorHandler("New Passwords Doesn't Match!", 400));

    }
    user.password = newPassword;
    await user.save();
    res.status(200).json({
        success: true,
        message: "Password Updated Successfully!",
    })
  });

  export const getUserForPortfolio = catchAsyncErrors(async(req, res, next)=>{
    const id ="68370de103d5710b387a6c19";
    const user = await User.findById(id);
    res.status(200).json({
        success:true,
        user,
    });
  });

  export const forgotPassword = catchAsyncErrors(async(req, res, next)=>{
    const user = await User.findOne({email: req.body.email});
    if(!user){
        return next(new ErrorHandler("User Not Found",404));
    }
    const resetToken = user.getResetPasswordToken();
    await user.save({validateBeforeSave: false});
    const resetPasswordUrl = `${process.env.DASHBOARD_URL}/password/reset/${resetToken}`;
    const message = `your Reset Password Token is:\n\n${resetPasswordUrl}\n\n Please ignore the message if you haven't requested for resetting the password.\n\nSISIR`;

    try{
        await sendEmail({
            email:user.email,
            subject: "Personal Portfolio Dashboard Password Reset",
            message,
        });
        res.status(200).json({
            success: true,
            message: `Email Sent to ${user.email} Successfully!`,
        })
    } catch(error){
        user.resetPasswordExpire= undefined;
        user.resetPasswordToken= undefined;
        await user.save();
        return next(new ErrorHandler(error.message,500));
    }
  });
  export const resetPassword = catchAsyncErrors(async (req, res, next) => {
    const { token } = req.params;
    const resetPasswordToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");
    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });
    if (!user) {
      return next(
        new ErrorHandler(
          "Reset password token is invalid or has been expired.",
          400
        )
      );
    }
  
    if (req.body.password !== req.body.confirmPassword) {
      return next(new ErrorHandler("Passwords Doesn't Match!"));
    }
    user.password = await req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
  
    await user.save();
  
    generateToken(user, "Reset Password Successfully!", 200, res);
  });