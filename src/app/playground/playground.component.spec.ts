import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';

import { PlaygroundComponent, RdfNode } from './playground.component';
import { JsonEditorModule } from 'ng-svelt-json-editor';
import { NgxGraphModule } from '@swimlane/ngx-graph';
import { RdfService } from '../common/rdf.service';
import { Subject } from 'rxjs';
import { Attribute, Resource } from '../common/rdf-handler';
import { Renderer2 } from '@angular/core';
import { TextContent } from 'vanilla-jsoneditor';
import { TypeaheadMatch } from 'ngx-bootstrap/typeahead';

describe('Given PlaygroundComponent', () => {
  let component: PlaygroundComponent;
  let fixture: ComponentFixture<PlaygroundComponent>;
  let mockReadySubject: Subject<boolean> = new Subject<boolean>();
  let mockResourceSubject: Subject<Resource> = new Subject<Resource>();
  let mockResourceListSubject: Subject<Resource[]> = new Subject<Resource[]>();

  let mockService: any;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PlaygroundComponent ],
      imports: [
        JsonEditorModule,
        NgxGraphModule
      ],
      providers: [
        { 
          provide: RdfService, 
          useValue: jasmine.createSpyObj('RdfService', {
            'getReadyObservable': mockReadySubject.asObservable(),
            'getResourceObservable': mockResourceSubject.asObservable(),
            'getResourceListObservable': mockResourceListSubject.asObservable(),
            'fetchNode': null,
            'loadRDF': null
          })
        },
        Renderer2
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    mockService = TestBed.inject(RdfService);
    mockService.fetchNode.calls.reset();
    fixture = TestBed.createComponent(PlaygroundComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    component.ngOnDestroy();
  });

  it('When constructed, Then it should create', () => {
    expect(component).toBeTruthy();
  });

  it('When ready observer received true, Then isReady should be true', fakeAsync(() => {    
    mockReadySubject.next(true);    
    tick();
    expect(component.isReady).toBeTrue();
  }));

  it('When resource list observer received array of 1 item, Then typeaheadNode list should container 1 item', fakeAsync(() => {    
    mockResourceListSubject.next([{} as Resource]);
    tick();
    expect(component.typeaheadNodeList.length).toEqual(1);
  }));

  it('When resource observer and addition, Then nodes has 2 items with 1 edge', fakeAsync(() => {
    const attributes: Attribute[] = [];
    attributes.push({} as Attribute);
    mockResourceSubject.next({
      attributes: attributes
    } as Resource);
    tick();
    expect(component.nodes.length).toEqual(2);
    expect(component.edges.length).toEqual(1);
  }));

  it('When jsonedit has valid data, Then loadRDF called with json', fakeAsync(() => {
    const mockData: TextContent = {text: 'foobar'}; 
    component.myJsonEditor = jasmine.createSpyObj('JsonEditorComponent', { 'isValidJson': true });

    component.changeJson(mockData);
    tick();
    expect(mockService.loadRDF).toHaveBeenCalledWith(mockData.text);
  }));

  it('When expand called with valid id, Then fetchNode called with id', fakeAsync(() => {
    const mockData: string = 'foobar';
    component.expandNode(mockData);
    tick();
    expect(mockService.fetchNode).toHaveBeenCalledWith(mockData);
  }));

  it('When typeahead selected, Then fetchNode called with id', fakeAsync(() => {
    const mockData: TypeaheadMatch = { 'item': { 'id': 'foobar' }} as TypeaheadMatch;
    component.onSelect(mockData);
    tick();
    expect(component.isAddition).toBeFalse();
    expect(mockService.fetchNode).toHaveBeenCalledWith(mockData.item.id);
  }));

  it('When additional node is added to screen, Then node increase by 1', fakeAsync(() => {
    const targetNode: RdfNode = { nodeId: 'foobar' } as RdfNode;
    component.nodes = [];
    component.nodes.push(targetNode);
    component.isAddition = true;

    const attr: Attribute = {
      key: 'key',
      value: 'value',
      label: 'label',
      type: 'type'
    };
    const attributes: Attribute[] = [];
    attributes.push(attr);

    const expandedNode: Resource = { 
      id: 'foobar',
      attributes: attributes
    } as Resource;
    mockResourceSubject.next(expandedNode);
    tick();    
    expect(component.edges.length).toEqual(1);
  }));
});
