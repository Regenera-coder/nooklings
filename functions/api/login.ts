import { handleLogin, type Env } from '../../server/api';

export const onRequestPost = (context: { request: Request; env: Env }): Promise<Response> => handleLogin(context.request, context.env);
