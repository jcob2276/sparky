/** Expected user-correctable input failures; upstream errors remain private in the HTTP kernel. */
import { HttpError } from '../_shared/http.ts';
export class HealthPlanInputError extends HttpError {
  constructor(message: string) { super(400, message); }
}
