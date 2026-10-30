import type { Handler, Mediator, MediatorOptions, Request, ResultOf } from './types.ts';

export function createMediator<Services, Stores>({
  services,
  stores,
  handlers,
}: MediatorOptions<Services, Stores>): Mediator {
  return {
    async send<R extends Request>(request: R): Promise<ResultOf<R>> {
      const handler = handlers[request.type] as unknown as Handler<R, Services, Stores> | undefined;
      if (!handler) throw new Error(`No handler registered for "${request.type}"`);
      return handler(request, { services, stores });
    },
  };
}
