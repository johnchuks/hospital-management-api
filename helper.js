import jwt from 'jsonwebtoken';
import _ from 'lodash';
import { User, Doctor, Patient } from './models/user';

export function validateUserInput(user) {
  if (!user.userName || !user.email || !user.password || !user.role || !user.phoneNumber) return false;
  return true;
};

export function getUserByEmail(email) {
  return User.findOne({ email }).exec();
};

export function getDoctorById(id) {
  return Doctor.findOne({ _id: id}).exec();
}

export function omitPassword(user) {
  return _.omit(user.toObject(), ['password']);
};

function filterPatientList(list) {
  const filtered = _.map(list, (c)  => {
    return _.omit(c, ['patients', 'password'])
  })
  return filtered;
}

function filterDoctorList(list) {
  const filtered = _.map(list, (c)  => {
    return _.omit(c, ['doctors', 'password'])
  })
  return filtered;
}
export function omitPasswordAndList(user) {
  if (user._type === 'Patient') {
  const updatedUser = _.omit(user.toObject(), ['password']);
  const doctors = filterPatientList(updatedUser.doctors);
  updatedUser.doctors = doctors;
  return updatedUser;
  }
  else if (user._type === 'Doctor') {
    const updatedUser = _.omit(user.toObject(), ['password']);
    const patientsList = filterDoctorList(updatedUser.patients);
    updatedUser.patients = patientsList;
    return updatedUser;
  }
}
export function getUserById(id) {
  return User.findById(id).exec();
}
export function findDoctors(user,id) {
  let isUser;
  return User.find({ doctors: id }).exec().then((user) => {
    if (user.length) {
      return isUser = true;
    }
    return isUser = false;
  }).catch(error => error); 
}

export function validateEmail(email) {
  const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
  const isEmailValid = emailRegex.test(email);
  if (!isEmailValid) {
    return false;
  }
  return true;
}
export function generateJwtToken(user) {
  const token = jwt.sign(
    user,
    process.env.JWT_SECRET,
    { expiresIn: '1 day' }
  );
  return token;
}
