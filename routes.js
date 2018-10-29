import express from 'express';
import UserController from './controllers/user';
import Middleware from './middlewares/auth';

const routerApi  = express.Router();

routerApi.post('/signup', UserController.signUpUser);
routerApi.post('/login', Middleware.checkPlatform, UserController.login);
routerApi.get('/doctor/:id([0-9]+)',Middleware.checkToken, Middleware.checkPatient, UserController.findDoctorById);
routerApi.put('/doctor/:id([0-9]+)', Middleware.checkToken, Middleware.checkPatient, UserController.addDoctorById);
routerApi.get('/user', Middleware.checkToken, UserController.getCurrentUser);
routerApi.put('/user', Middleware.checkToken, UserController.updateProfile);
routerApi.put('/change-password', Middleware.checkToken, UserController.changePassword);
export default routerApi;
