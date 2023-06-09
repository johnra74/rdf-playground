import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { RdfCommand, RdfHandler, RdfType, Resource } from './rdf-handler';

import ParserJsonLd from '@rdfjs/parser-jsonld';

@Injectable({
  providedIn: 'root'
})
export class RdfService {

  private readySubject: Subject<boolean>;
  private fetchResourceListSubject: Subject<Resource[]>;
  private fetchUniformResourceListSubject: Subject<Resource[]>;
  private fetchResourceSubject: Subject<Resource>;
  private fetchTypeListSubject: Subject<string[]>;
  private commandSubject: Subject<RdfCommand>;  

  constructor() { 
    this.commandSubject = new Subject<RdfCommand>();
    this.readySubject = new Subject<boolean>();
    this.fetchResourceListSubject = new Subject<Resource[]>();
    this.fetchUniformResourceListSubject = new Subject<Resource[]>();
    this.fetchResourceSubject = new Subject<Resource>();
    this.fetchTypeListSubject = new Subject<string[]>();

    if (typeof Worker !== 'undefined') {
      // Create a new
      const worker: Worker = new Worker(new URL('./rdf.worker', import.meta.url));
      worker.onmessage = ({ data }) => {
        if (data.success) {          
          const cmd: RdfCommand = data.command;
          console.log(`Command type [${cmd.type}] completed successfully!`);
          switch (cmd.type) {
            case RdfType.INIT:
              this.readySubject.next(true);
              break;
            case RdfType.FETCH:
              if (cmd.arguments[0] === 'all') {
                this.fetchResourceListSubject.next(data.result);
              } else if (cmd.arguments[0] === 'types') {
                this.fetchTypeListSubject.next(data.result);
              } else if (cmd.arguments[0] === 'type') {
                this.fetchUniformResourceListSubject.next(data.result);
              } else {
                this.fetchResourceSubject.next(data.result);
              }
              break;
            default:
              break;
          }          
        } else {
          console.log(`Command type [${data.command.type}] failed with ${data.result}!`)
        }
        
      };
      
      this.commandSubject.asObservable()
        .subscribe({ 
          next: (cmd: RdfCommand) => {
            worker.postMessage(cmd);
          },
          error: (e) => console.log('error sending command to worker: ' + e),
          complete: () => console.log('completed worker cmd call')
        });
    } else {
      // If Web worker is not supported in this environment,
      // Run Handler on main thread. NOTE: this may performance impact on large data
      const handler: RdfHandler = new RdfHandler(new ParserJsonLd());
      this.commandSubject.asObservable()
        .subscribe({ 
          next: (cmd: RdfCommand) => {
            handler.execute(cmd);
          },
          error: (e) => console.log('error sending command to handler: ' + e),
          complete: () => console.log('completed handler cmd call')
        });
    }
  }

  public getReadyObservable(): Observable<boolean> {
    return this.readySubject.asObservable();
  }

  public getResourceListObservable(): Observable<Resource[]> {
    return this.fetchResourceListSubject.asObservable();
  }

  public getUniformResourceListObservable(): Observable<Resource[]> {
    return this.fetchUniformResourceListSubject.asObservable();
  }

  public getResourceObservable(): Observable<Resource> {
    return this.fetchResourceSubject.asObservable();
  }

  public getTypeListObservable(): Observable<string[]> {
    return this.fetchTypeListSubject.asObservable();
  }

  public loadRDF(jsonld: string): void {
    const cmd: RdfCommand = { type: RdfType.INIT, arguments: [jsonld] };
    this.commandSubject.next(cmd);
  }

  public fetchNode(argument: string = 'all'): void {
    const cmd: RdfCommand = { type: RdfType.FETCH, arguments: [argument] } as RdfCommand;
    this.commandSubject.next(cmd);
  }

  public fetchTypes(): void {
    const cmd: RdfCommand = { type: RdfType.FETCH, arguments: ['types'] } as RdfCommand;
    this.commandSubject.next(cmd);
  }

  public fetchNodeListByType(type: string): void {
    const cmd: RdfCommand = { type: RdfType.FETCH, arguments: ['type', type ]} as RdfCommand;
    this.commandSubject.next(cmd);
  }
}
