import jwt from 'jsonwebtoken';
import { getUserById, getUserByEmail } from '../helper';

class Middleware {
  static checkToken(req, res, next) {
    const token = req.headers.authorization || req.headers['x-access-token'];
    const secret = process.env.JWT_SECRET;
    if (token) {
      jwt.verify(token, secret, (error, decoded) => {
        if (error) {
          return res.send({ success: false, message: 'Invalid token' });
        }
        req.decoded = decoded;
        return next();
      });
    } else {
      return res.status(401).send({
        success: false,
        message: 'No token provided.'
      });
    }
  }

  static async checkPatient(req, res, next) {
    const user = await getUserById(req.decoded._id);
    if (user.role === 'patient') {
      return next();
    }
    return res.status(401).send({
      success: false,
      message: 'Unauthorized access'
    });
  }

  static checkDoctor(req, res, next) {
    const user = req.decoded;
    if (user.role === 'doctor') {
      return next();
    }
    return res.status(401).send({
      success: false,
      message: 'Unauthorized access'
    });
  }

  static checkPlatform(req, res, next) {
    const platformType = req.headers.type;
    if (!platformType) {
      return res.status(400).json({
        success: false,
        message: 'Please indicate the platform type on the header of the request object'
      });
    }
    if (platformType === 'web') {
      return next();
    } else if (platformType === 'mobile') {
      getUserByEmail(req.body.email).then((existingUser) => {
        if (!existingUser) {
          return res.status(404).json({
            success: false,
            message: 'User does not exist'
          });
        }
        if (existingUser._type === 'Patient') {
          next();
        } else if (existingUser._type === 'Doctor') {
          return res.status(401).json({
            success: false,
            message: 'You are not authorized to access this platform'
          });
        }
      }).catch(error => res.status(500).send(error));
    }
  }
}
export default Middleware;
