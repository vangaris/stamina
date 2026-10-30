import { describe, expect, it } from 'vitest';
import { createMediator } from './create-mediator.ts';
import type { Handler, Request } from './types.ts';

enum TestRequestType {
  Echo = 'Echo',
  Missing = 'Missing',
  Boom = 'Boom',
}

interface Echo extends Request<string> {
  readonly type: TestRequestType.Echo;
  readonly text: string;
}

describe('createMediator', () => {
  it('routes a request to the handler registered for its type, with services and stores', async () => {
    const services = { name: 'services' };
    const stores = { name: 'stores' };
    const echo: Handler<Echo, typeof services, typeof stores> = async (request, context) =>
      `${request.text}:${context.services.name}:${context.stores.name}`;
    const mediator = createMediator({
      services,
      stores,
      handlers: { [TestRequestType.Echo]: echo },
    });

    const result = await mediator.send<Echo>({ type: TestRequestType.Echo, text: 'hi' });

    expect(result).toBe('hi:services:stores');
  });

  it('rejects a request whose type has no handler, naming the type', async () => {
    const mediator = createMediator({ services: {}, stores: {}, handlers: {} });

    await expect(mediator.send({ type: TestRequestType.Missing })).rejects.toThrow(
      'No handler registered for "Missing"',
    );
  });

  it('propagates handler errors to the caller', async () => {
    const boom: Handler<Request, object, object> = async () => {
      throw new Error('boom');
    };
    const mediator = createMediator({
      services: {},
      stores: {},
      handlers: { [TestRequestType.Boom]: boom },
    });

    await expect(mediator.send({ type: TestRequestType.Boom })).rejects.toThrow('boom');
  });
});
