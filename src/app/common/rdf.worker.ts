/// <reference lib="webworker" />
import ParserJsonLd from '@rdfjs/parser-jsonld';
import { RdfHandler, Response } from './rdf-handler';

const parser: ParserJsonLd = new ParserJsonLd();
const handler: RdfHandler = new RdfHandler(parser);

handler.getResponseObservable()
      .subscribe({
        next: (resp: Response) => {
          console.log('received response from handler, posting message back to app');
          postMessage(resp);
        },
        error: (e) => console.log('Unexpected error on RDF Handler: ' + e),
        complete: () => console.log('completed RDF handler')
      });

addEventListener('message', ({ data }) => {
  handler.execute(data);
});
