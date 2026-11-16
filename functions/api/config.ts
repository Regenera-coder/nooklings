import { handleConfig, type Env } from '../../server/api';

export const onRequestGet = (context: { env: Env }): Response => handleConfig(context.env);
