import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from '../services/auth-service';
import {
  RegisterRequest,
  LoginRequest,
  RefreshTokenRequest,
  ChangePasswordRequest,
  UpdateProfileRequest,
  LogoutRequest
} from '../types';

export class AuthController {
  private authService?: AuthService;

  constructor(private fastify: FastifyInstance) {
    // AuthService will be initialized when repositories are available
    // For now, we'll throw an error if methods are called before initialization
  }

  setAuthService(authService: AuthService) {
    this.authService = authService;
  }

  async register(request: FastifyRequest<{ Body: RegisterRequest }>, reply: FastifyReply) {
    if (!this.authService) {
      throw this.fastify.httpErrors.internalServerError('Auth service not initialized');
    }

    const user = await this.authService.register(request.body);
    reply.code(201).send({
      message: 'User registered successfully',
      user
    });
  }

  async login(request: FastifyRequest<{ Body: LoginRequest }>, reply: FastifyReply) {
    if (!this.authService) {
      throw this.fastify.httpErrors.internalServerError('Auth service not initialized');
    }

    const loginResponse = await this.authService.login(request.body);
    reply.send(loginResponse);
  }

  async refresh(request: FastifyRequest<{ Body: RefreshTokenRequest }>, reply: FastifyReply) {
    if (!this.authService) {
      throw this.fastify.httpErrors.internalServerError('Auth service not initialized');
    }

    const tokens = await this.authService.refreshToken(request.body.refresh_token);
    reply.send(tokens);
  }

  async logout(request: FastifyRequest<{ Body: LogoutRequest }>, reply: FastifyReply) {
    if (!this.authService) {
      throw this.fastify.httpErrors.internalServerError('Auth service not initialized');
    }

    const user = (request as FastifyRequest & { user: { id: string } }).user;
    await this.authService.logout(user.id, request.body.refresh_token);
    reply.send({ message: 'Logged out successfully' });
  }

  async getProfile(request: FastifyRequest, reply: FastifyReply) {
    if (!this.authService) {
      throw this.fastify.httpErrors.internalServerError('Auth service not initialized');
    }

    const user = (request as FastifyRequest & { user: { id: string } }).user;
    const profile = await this.authService.getProfile(user.id);
    reply.send({ user: profile });
  }

  async updateProfile(request: FastifyRequest<{ Body: UpdateProfileRequest }>, reply: FastifyReply) {
    if (!this.authService) {
      throw this.fastify.httpErrors.internalServerError('Auth service not initialized');
    }

    const user = (request as FastifyRequest & { user: { id: string } }).user;
    const updatedUser = await this.authService.updateProfile(user.id, request.body);
    reply.send({
      message: 'Profile updated successfully',
      user: updatedUser
    });
  }

  async changePassword(request: FastifyRequest<{ Body: ChangePasswordRequest }>, reply: FastifyReply) {
    if (!this.authService) {
      throw this.fastify.httpErrors.internalServerError('Auth service not initialized');
    }

    const user = (request as FastifyRequest & { user: { id: string } }).user;
    await this.authService.changePassword(user.id, request.body);
    reply.send({ message: 'Password changed successfully' });
  }

  async verifyEmail(request: FastifyRequest, reply: FastifyReply) {
    if (!this.authService) {
      throw this.fastify.httpErrors.internalServerError('Auth service not initialized');
    }

    const user = (request as FastifyRequest & { user: { id: string } }).user;
    await this.authService.verifyEmail(user.id);
    reply.send({ message: 'Email verified successfully' });
  }
}
