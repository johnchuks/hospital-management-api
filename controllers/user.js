import { User, Doctor, Patient } from "../models/user";
import {
  validateUserInput,
  validateEmail,
  getUserByEmail,
  omitPassword,
  generateJwtToken,
  getDoctorById,
  omitPasswordAndList,
  findDoctors,
  getUserById
} from "../helper";
import { create } from "domain";

export default {
  /**
   *
   * Sign up a new user
   * @param {object} req - request object
   * @param {object} res - response object
   * @returns {object} return a newly created user
   */
  signUpUser(req, res) {
    const user = req.body;
    const userValidation = validateUserInput(user);
    if (!userValidation) {
      return res.status(400).json({
        message: "All user information fields are required"
      });
    }
    if (!validateEmail(user.email)) {
      return res.status(400).json({
        message: "Invalid email address"
      });
    }

    getUserByEmail(user.email)
      .then(existingUser => {
        if (existingUser) {
          return res.status(409).send({
            message: "User already exist"
          });
        }
        let newUser;
        if (user.role === "patient") {
          newUser = new Patient({
            userName: user.userName,
            email: user.email,
            password: user.password,
            phoneNumber: user.phoneNumber,
            role: user.role
          });
        } else if (user.role === "doctor") {
          if (!user.hospital || !user.department) {
            return res.status(400).json({
              success: false,
              message: "Hosiptal and department fields are required"
            });
          }
          newUser = new Doctor({
            userName: user.userName,
            email: user.email,
            password: user.password,
            phoneNumber: user.phoneNumber,
            role: user.role,
            hospital: user.hospital,
            department: user.department
          });
        }
        newUser
          .save()
          .then(async userCreated => {
            const createdUser = omitPassword(userCreated);
            const tokenPayload = {
              email: createdUser.email,
              _id: createdUser._id
            };
            const token = generateJwtToken(createdUser);
            return res.status(201).json({
              createdUser,
              token
            });
          })
          .catch(error => {
            return res.status(500).send(error);
          });
      })
      .catch(error => {
        return res.status(500).send(error);
      });
  },

  login(req, res) {
    const user = req.body;
    if (!user.email || !user.password) {
      return res.status(400).send({
        status: false,
        message: "All login fields are required"
      });
    }
    if (!validateEmail(user.email)) {
      return res.status(400).json({
        message: "Invalid email address"
      });
    }
    getUserByEmail(user.email)
      .then(async existingUser => {
        if (existingUser) {
          const checkPassword = await existingUser.authenticate(user.password);
          if (checkPassword) {
            const loginUser = omitPassword(existingUser);
            const tokenPayload = {
              email: loginUser.email,
              _id: loginUser._id
            };
            const token = generateJwtToken(tokenPayload);
            return res.status(200).json({
              loginUser,
              token
            });
          }
          return res.status(400).json({
            success: false,
            message: "Password is incorrect"
          });
        }
        return res.status(404).json({
          success: false,
          message: "User does not exist"
        });
      })
      .catch(error => res.status(500).send(error));
  },

  updateProfile(req, res) {
    const user = req.body;
    User.findById(req.decoded._id)
      .then(existingUser => {
        if (!existingUser) {
          return res.status(404).json({
            success: false,
            message: "User not found"
          });
        }
        if (existingUser._type === "Doctor") {
          existingUser
            .update({
              userName: user.name || existingUser.userName,
              phoneNumber: user.phoneNumber || existingUser.phoneNumber,
              hospital: user.hospital || existingUser.hospital,
              department: user.department || existingUser.department
            })
            .then(() => {
              getUserById(req.decoded._id).then(user => {
                const updatedUser = omitPasswordAndList(user);
                return res.status(200).send(updatedUser);
              });
            })
            .catch(error => res.status(500).send(error));
        } else {
          existingUser
            .update({
              userName: user.name || existingUser.userName,
              phoneNumber: user.phoneNumber || existingUser.phoneNumber
            })
            .then(() => {
              getUserById(req.decoded._id).then(user => {
                const updatedUser = omitPasswordAndList(user);
                return res.status(200).send(updatedUser);
              });
            })
            .catch(error => res.status(500).send(error));
        }
      })
      .catch(error => res.status(500).send(error));
  },

  findDoctorById(req, res) {
    const id = req.params.id;
    const params = parseInt(id, 10);
    User.findOne({ doctorId: params }).then(doctor => {
      if (!doctor) {
        return res.status(404).json({
          success: false,
          message: "Doctor not found"
        });
      }
      return res.status(200).send(doctor);
    });
  },

  addDoctorById(req, res) {
    const authUser = req.decoded._id;
    const id = req.params.id;
    const params = parseInt(id, 10);
    User.findOne({ doctorId: params })
      .then(doctor => {
        if (!doctor) {
          return res.status(404).json({
            success: false,
            message: "Doctor not found"
          });
        }
        User.findById(authUser).then(async authenticatedUser => {
          if (!authenticatedUser) {
            return res.status(404).json({
              success: false,
              message: "User does not exist"
            });
          }
          const doctors = authenticatedUser.doctors;
          const id = doctor._id;
          const updatedDoctor = omitPasswordAndList(doctor);
          const currentUser = omitPasswordAndList(authenticatedUser);
          authenticatedUser.doctors.addToSet(updatedDoctor);
          doctor.patients.addToSet(currentUser);
          doctor.save();
          authenticatedUser.save().then(async updatedUser => {
            const newUser = await User.findById(updatedUser._id).populate("doctors");
            const currentUser = omitPasswordAndList(newUser);
            return res.status(200).send(currentUser);
          });
        });
      })
      .catch(error => res.status(500).send(error));
  },

  getCurrentUser(req, res) {
    const id = req.decoded._id;
    let currentUser;
    User.findById(id)
      .then(async existingUser => {
        if (!existingUser) {
          return res.status(404).json({
            success: false,
            message: "User does not exist"
          });
        }
        if (existingUser._type === "Doctor") {
          const user = await User.findById(id).populate("patients");
          currentUser = omitPasswordAndList(user);
        } else if (existingUser._type === "Patient") {
          const user = await User.findById(id).populate("doctors");
          currentUser = omitPasswordAndList(user);
        }
        return res.status(200).send(currentUser);
      })
      .catch(error => res.status(500).send(error));
  },

  changePassword(req, res) {
    const user = req.body;
    getUserById(req.decoded._id).then(async (existingUser) => {
      if (!existingUser) {
        return res.status(404).json({
          success: false,
          message: 'User does not exist'
        });
      }
      const checkPassword = await existingUser.authenticate(user.oldPassword);
      if (!checkPassword) {
        return res.status(400).json({
          success: false,
          message: 'Password is incorrect'
        });
      }
      const hashPassword = await existingUser.encryptPassword(user.newPassword);
      existingUser.update({
        password: hashPassword
      }).then(() => {
        return res.status(200).json({
          success: true,
          message: 'Password updated successfully'
        });
      }).catch(error => res.status(500).send(error)); 
    }).catch(error => res.status(500).send(error));
  }
};
