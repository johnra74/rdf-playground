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
    expect(service.getUniformResourceListObservable()).toBeTruthy();
    expect(service.getTypeListObservable()).toBeTruthy();    
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

  it('When fetch Node is called, then it should fail', fakeAsync(() => {
    service.getResourceObservable().subscribe( {
      next: (res: Resource) => {
        expect(res).toBeNull();
      }
    })
    service.fetchNode('foobar');
    tick()
  }));

  it('When fetch Types is called, then it should fail', fakeAsync(() => {
    service.getTypeListObservable().subscribe( {
      next: (list:string[]) => {
        expect(list.length).toEqual(0);
      }
    })
    service.fetchTypes();
    tick()
  }));

  it('When fetch uniform resource List is called, then it should fail', fakeAsync(() => {
    service.getUniformResourceListObservable().subscribe( {
      next: (list:Resource[]) => {
        expect(list).toBeNull();
      }
    })
    service.fetchNodeListByType('foo');
    tick()
  }));

});
