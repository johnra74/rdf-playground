import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { Resource } from './rdf-handler';

import { RdfService } from './rdf.service';

describe('Given RdfService', () => {
  let service: RdfService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RdfService);
  });

  it('When instanciated, it should be an instance', () => {
    expect(service).toBeTruthy();
    expect(service.getReadyObservable()).toBeTruthy();
    expect(service.getResourceListObservable()).toBeTruthy();
    expect(service.getResourceObservable()).toBeTruthy();
  });

  it('When loadRDF is called, then worker is initialized', fakeAsync(() => {
    service.getReadyObservable().subscribe({
      next: (flag: boolean) => {
        expect(flag).toBeTrue();
      }
    });
    service.loadRDF('{ "foo": "bar" }');
    tick();
  }));

  it('When fetch is called, then it should fail', fakeAsync(() => {
    service.getResourceObservable().subscribe( {
      next: (res: Resource) => {
        expect(res).toBeNull();
      }
    })
    service.fetchNode('foobar');
    tick()
  }));

});
