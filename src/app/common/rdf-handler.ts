import ParserJsonLd from '@rdfjs/parser-jsonld';
import { Readable } from 'readable-stream';
import { filter } from 'lodash';
import { Observable, Subject } from 'rxjs';

export enum RdfType {
  INIT, FETCH
}

export interface RdfCommand {
  type: RdfType;
  argument: string;
}

export interface Response {
  command: RdfCommand;
  success: boolean;
  result?: any;
  message?: string;
}

export interface Resource {
  id: string;
  type: string;  
  title: string;
  attributes: Attribute[];
}

export interface Attribute {
  key: string;
  value: string;
  label: string;
  type: string;
}

export interface Coercion {
  prefix: string;
  namespace: string;
}

export class RdfHandler {
  
  private responseSubject: Subject<Response>;
  private parser: ParserJsonLd;
  private cache: Resource[];
  private isReady: boolean;
  private context: Coercion[];

  constructor(parser: ParserJsonLd) {
    this.cache = [];
    this.context = [];
    this.isReady = false;
    this.parser = parser;    
    this.responseSubject = new Subject<Response>();
  }

  public execute(cmd: RdfCommand): void {
    switch(cmd.type) {
      case RdfType.INIT:
        this.cache = [];
        this.isReady = false;
        this.process(cmd);
        break;
      case RdfType.FETCH:
        if (cmd.argument === 'all') {
          this.responseSubject.next({ 
            command: cmd,
            success: true, 
            result: this.cache
          });
        } else {
          const matches:Resource[] =
            filter(this.cache, (item:Resource) => item.id === cmd.argument);
          if (typeof matches !== 'undefined' && matches.length > 0) {
            this.responseSubject.next( {
              command: cmd,
              success: true,
              result: matches[0]
            });
          } else {
            this.responseSubject.next( {
              command: cmd,
              success: false,
              message: 'Unable to find node!'
            })
          }
        }        
        break;
      default:
        this.responseSubject.next({ 
          command: cmd,
          success: false, 
          message: 'unsupported command type' 
        });
        break;
    }

  }

  public getResponseObservable(): Observable<Response> {
    return this.responseSubject.asObservable();
  }

  private process(command: RdfCommand): void {
    const input: Readable = new Readable({
      read: () => {
        input.push(command.argument);    
        input.push(null);        
      }
    });

    const output = this.parser.import(input);
    output.on('data', quad => {
      // console.log(JSON.stringify(quad));
      const matches: Resource[] = filter(this.cache, (node:Resource) => node.id === quad.subject.value);
      if (typeof matches !== 'undefined' && matches.length > 0) {
        this.updateAttribute(matches[0], quad.predicate.value, quad.object);
      } else {
        const node: Resource = { id: quad.subject.value } as Resource;
        node.attributes = [];
        this.updateAttribute(node, quad.predicate.value, quad.object);
        this.cache.push(node);
      }
    })
    .on('prefix', (prefix, namespace) => {
      if (isNaN(prefix)) {
        const coercion: Coercion = { prefix: prefix, namespace: namespace.value };
        this.context.push(coercion);
      }
    })
    .on('error', (e) => console.log('error processing triple store: ' + e))
    .on('end', () => {
      this.isReady = true;
      this.responseSubject.next({ command: command, success: true, message: 'completed' });
    });
  }

  private updateAttribute(node: Resource, predicate: string, object: any) {
    if (predicate === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type') {
      node.type = object.value;
    } else if (predicate === 'http://purl.org/dc/terms/title') {
      node.title = object.value;    
    }

    const attribute: Attribute = { 
      key: predicate, 
      label: this.toLabel(predicate), 
      value: object.value, 
      type: object.termType 
    };

    node.attributes.push(attribute);
  }

  private toLabel(predicate: string): string {
    const matches: Coercion[] =
      filter(this.context, (coercion) => predicate.startsWith(coercion.namespace));

    let label: string = predicate;
    if (typeof matches !== 'undefined' && matches.length > 0) {
      label = predicate.replace(matches[0].namespace, `${matches[0].prefix}:`);
    }

    return label;
  }
}
