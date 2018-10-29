import mongoose from 'mongoose';
import extend from 'mongoose-schema-extend';
import bcrypt from 'bcrypt';

const AutoIncrement = require('mongoose-sequence')(mongoose);
const Schema = mongoose.Schema;
var ValidationError = mongoose.Error.ValidationError;
var ValidatorError = mongoose.Error.ValidatorError;

const UserSchema = new Schema({
  fullName: {
    type: String,
  },
  userName: {
    type: String,
    required: true
  },
  email: {
    type: String,
    unique: true,
    required: [true, 'Email address is required']
  },
  password: {
    type: String,
    unique: true,
    required: [true, 'Password is required']
  },
  phoneNumber: {
    type: String,
    required: [true, 'User phone number required']
  },
  role: {
    type: String,
    enum: ['doctor', 'patient'],
    required: true
  }
}, { collection : 'users', discriminatorKey : '_type' });

UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await UserSchema.methods.encryptPassword(this.password);
  next();

});


UserSchema.methods = {
  authenticate: function (plainPassword) {
    if (!plainPassword || !this.password) {
      return false;
    }
    return bcrypt.compareSync(plainPassword, this.password);
  },
  encryptPassword: function (password) {
    if (!password) {
      return '';
    }
    return bcrypt.hashSync(password, bcrypt.genSaltSync(10), (err, hash) => {
      if (err) return err;
      return hash;
    })
  }
}

const DoctorSchema = UserSchema.extend({
    hospital: {
      type: String,
      required: [true, 'Hospital is required']
    },
    department: {
      type: String,
      required: [true, 'Department is required']
    },
    doctorId: {
      type: Number,
    },
    patients: [{ type: Schema.Types.ObjectId, ref: 'Patient'}]
})

const PatientSchema = UserSchema.extend({
  patientId: {
    type: Number,
  },
  doctors: [{ type: Schema.Types.ObjectId, ref: 'Doctor'}]
})

DoctorSchema.plugin(AutoIncrement, { inc_field: 'doctorId' });
PatientSchema.plugin(AutoIncrement, { inc_field: 'patientId' });
const User = mongoose.model('User', UserSchema);
const Doctor = mongoose.model('Doctor', DoctorSchema);
const Patient = mongoose.model('Patient', PatientSchema);

export  { User, Doctor, Patient };
