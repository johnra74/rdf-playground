import { fakeAsync, tick } from '@angular/core/testing';
import { RdfCommand, RdfHandler, RdfType, Response } from './rdf-handler';

class MockStream {

  private endListener: any;
  private dataListener: any;
  private prefixListener: any;

  on(eventName: string | symbol, listener: (...args: any[]) => void): this {
    if (eventName === 'data') {
      this.dataListener = listener;
    } else if (eventName === 'end') {
      this.endListener = listener;      
    } else if (eventName === 'prefix') {
      this.prefixListener = listener;
    }
    return this;
  }
  
  triggerEnd(): void {
    this.endListener();
  }

  triggerData(quad: any): void {
    this.dataListener(quad);
  }

  triggerPrefix(prefix: string, namespace: any): void {
    this.prefixListener(prefix, namespace);
  }
}

describe('Given RdfHandler', () => {
  const mockStream = new MockStream();
  const mockParser = jasmine.createSpyObj('ParserJsonLd', { 'import': mockStream });
  it('When constructed, it should be an instance', () => {
    expect(new RdfHandler(mockParser)).toBeTruthy();
  });

  it('When init command, it should process statements and return isReady', fakeAsync(() => {
    const handler: RdfHandler = new RdfHandler(mockParser);
    handler.getResponseObservable().subscribe({
      next: (resp: Response) => {
        expect(resp.success).toBeTrue();
      }
    });

    initializeWorkerData(handler);
    tick();
    // rest is occuring on the observable
  }));

  it('When fetch command for all, it should return 1', fakeAsync(() => {
    const handler: RdfHandler = new RdfHandler(mockParser);
    initializeWorkerData(handler);

    handler.getResponseObservable().subscribe({
      next: (resp: Response) => {
        if (resp.command.type === RdfType.FETCH) {
          expect(resp.success).toBeTrue();
          expect(resp.command.arguments[0]).toEqual('all');
          expect(resp.result.length).toEqual(1);
        }
      }
    });

    const cmd: RdfCommand = { type: RdfType.FETCH, arguments: ['all'] };
    handler.execute(cmd);
    
    tick();
    // rest is occuring on the observable
  }));

  it('When fetch command for `foo`, it should return 1', fakeAsync(() => {
    const handler: RdfHandler = new RdfHandler(mockParser);
    initializeWorkerData(handler);

    handler.getResponseObservable().subscribe({
      next: (resp: Response) => {
        if (resp.command.type === RdfType.FETCH) {
          expect(resp.success).toBeTrue();
          expect(resp.command.arguments[0]).toEqual('foo');
          expect(resp.result.id).toEqual('foo');
        }
      }
    });

    const cmd: RdfCommand = { type: RdfType.FETCH, arguments: ['foo'] };
    handler.execute(cmd);
    
    tick();
    // rest is occuring on the observable
  }));

  it('When fetch command for `bar`, success should false', fakeAsync(() => {
    const handler: RdfHandler = new RdfHandler(mockParser);
    initializeWorkerData(handler);

    handler.getResponseObservable().subscribe({
      next: (resp: Response) => {
        if (resp.command.type === RdfType.FETCH) {
          expect(resp.success).toBeFalse();
          expect(resp.message).toEqual('Unable to find node!');
        }
      }
    });

    const cmd: RdfCommand = { type: RdfType.FETCH, arguments: ['bar'] };
    handler.execute(cmd);
    
    tick();
    // rest is occuring on the observable
  }));

  it('When fetch command is invalid type, success should false', fakeAsync(() => {
    const handler: RdfHandler = new RdfHandler(mockParser);
    initializeWorkerData(handler);

    handler.getResponseObservable().subscribe({
      next: (resp: Response) => {
        expect(resp.command.type).toEqual(-1);
        expect(resp.success).toBeFalse();
        expect(resp.message).toEqual('unsupported command type');
      }
    });

    const cmd: RdfCommand = { type: -1, arguments: ['bar'] };
    handler.execute(cmd);
    
    tick();
    // rest is occuring on the observable
  }));

  function initializeWorkerData(handler: RdfHandler) {
    const cmd: RdfCommand = { type: RdfType.INIT, arguments: ['foo'] };
    handler.getResponseObservable().subscribe({
      next: (resp: Response) => {
        if (resp.command.type === RdfType.INIT) {
          expect(resp.success).toBeTrue();
        }        
      }
    });

    handler.execute(cmd);
    tick();
    mockStream.triggerData({ 
      subject: {
        value: 'foo'
      },
      predicate: {
        value: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type'
      },
      object: {
        value: 'bar'
      }
    });
    mockStream.triggerData({ 
      subject: {
        value: 'foo'
      },
      predicate: {
        value: 'http://purl.org/dc/terms/title'
      },
      object: {
        value: 'Foo Bar'
      }
    });

    mockStream.triggerPrefix('foobar', { value: 'http://purl.org/dc/terms/' });
    mockStream.triggerEnd();
  }

});
