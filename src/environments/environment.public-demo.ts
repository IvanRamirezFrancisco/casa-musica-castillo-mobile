import { environment as production } from './environment.prod';
import { AppEnvironment } from './environment-settings';

export const environment = { ...production, publicDemo: true } satisfies AppEnvironment;
