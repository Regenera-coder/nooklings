import { handleSave, type Env } from '../../server/api';

export const onRequest = (context: { request: Request; env: Env }): Promise<Response> => handleSave(context.request, context.env);
