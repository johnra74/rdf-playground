import { AfterViewChecked, Component, HostListener, OnDestroy, Renderer2, ViewChild } from '@angular/core';
import { RdfService } from '../common/rdf.service';
import { JSONEditorPropsOptional, Mode } from 'vanilla-jsoneditor';
import { Edge, Node } from '@swimlane/ngx-graph';
import { Subscription } from 'rxjs';
import { v4 as uuid } from 'uuid';

import { Attribute, Resource } from '../common/rdf-handler';
import { TypeaheadMatch } from 'ngx-bootstrap/typeahead';
import { filter, forEach } from 'lodash';
import { JsonEditorComponent } from 'ng-svelt-json-editor';
import { OnInit } from '@angular/core';

export interface RdfNode extends Node {
  nodeId: string;
  isLiteral: boolean;
  canExpand: boolean;
}

@Component({
  selector: 'app-playground',
  templateUrl: './playground.component.html',
  styleUrls: ['./playground.component.scss']
})
export class PlaygroundComponent implements OnDestroy, OnInit, AfterViewChecked {

  defaultMode: Mode = Mode.text;
  edges: Edge[] = [];
  nodes: RdfNode[] = [];
  isReady: boolean;  
  isAddition: boolean;
  isStacked: boolean;
  selectedNode?: Resource;
  typeaheadNodeList: Resource[];

  width: number;
  height: number;

  jsonEditOptions: JSONEditorPropsOptional = {
    mode: Mode.text,
    mainMenuBar: false,
    readOnly: false
  };

  @ViewChild('myJsonEdit')
  myJsonEditor?: JsonEditorComponent;

  private onReadySubscription: Subscription;
  private resourceListSubscription: Subscription;
  private resourceSubscription: Subscription;

  constructor(private renderer: Renderer2, private service: RdfService) {
    this.isReady = false;
    this.isAddition = false;
    this.isStacked = true;
    this.width = 800;
    this.height = 500;
    
    this.onReadySubscription = 
      service.getReadyObservable().subscribe({
        next: (flag: boolean) => {
          if (flag) {
            this.isReady = flag;
            this.service.fetchNode();
          }
        },
        error: (e) => console.log('failed to retrieve ready status: ' + e),
        complete: () => console.log('completed ready status call')
      });
    
    this.typeaheadNodeList = [];
    this.resourceListSubscription =
      service.getResourceListObservable().subscribe({
        next: (list: Resource[]) => {
          this.typeaheadNodeList = list;
        },
        error: (e) => console.log('failed to retrieve node list: ' + e),
        complete: () => console.log('completed retrieve node list call')
      });
    
    this.resourceSubscription =
      service.getResourceObservable().subscribe( {
        next: (item: Resource) => {
          let localNodes: RdfNode[];
          let localEdges: Edge[];
          let sourceId: string;
          if (this.isAddition) {
            const matches: RdfNode[] =
              filter(this.nodes, (n) => n.nodeId === item.id);
            if (typeof matches !== 'undefined' && matches.length > 0) {
              sourceId = matches[0].id;
              matches[0].canExpand = false;
            }
            localNodes = [...this.nodes];
            localEdges = [...this.edges];
          } else {
            sourceId = uuid();
            const root: RdfNode = {
              id: sourceId,
              nodeId: item.id, 
              label: `${item.title} (${item.id})`, 
              isLiteral: false, 
              canExpand: false 
            };
            localNodes = [];
            localEdges = [];
            localNodes.push(root);
          }

          forEach(item.attributes, (attr: Attribute) => {
            const propNode: RdfNode = { 
              id: uuid(),
              nodeId: `${attr.value}`,
              label: `${attr.value}`, 
              isLiteral: attr.type === 'Literal',
              canExpand: this.canExpand(attr.value)
            };
            const edge: Edge = { source: sourceId, target: propNode.id, label: `${attr.label}` };
            
            localNodes.push(propNode);
            localEdges.push(edge);
          });

          this.nodes = [...localNodes];
          this.edges = [...localEdges];
        },
        error: (e) => console.log('failed to retrieve node: ' + e),
        complete: () => console.log('completed call')
      })
  }

  ngAfterViewChecked(): void {
    this.renderer.setStyle(this.myJsonEditor?.editor.nativeElement, 'height', `${this.height}px`);
  }

  ngOnInit(): void {
    this.setDimension();    
  }

  ngOnDestroy(): void {
    this.onReadySubscription.unsubscribe();
    this.resourceListSubscription.unsubscribe();
    this.resourceSubscription.unsubscribe();
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.setDimension();
    this.renderer.setStyle(this.myJsonEditor?.editor.nativeElement, 'height', `${this.height}px`);
  }

  onSelect(match:TypeaheadMatch): void {
    this.isAddition = false;
    this.service.fetchNode(match.item.id);
  }

  expandNode(nodeId:string) : void {
    this.isAddition = true;
    this.service.fetchNode(nodeId);
  }

  public changeJson(content: any): void {
    if (this.myJsonEditor?.isValidJson()) {
      this.service.loadRDF(content.text);
    }    
  }

  private setDimension(): void {
    if (window.innerWidth < 1440) {
      this.width = window.innerWidth - 50;
      this.height = (window.innerHeight/2) - 150;  
      this.isStacked = true;
    } else {
      this.width = (window.innerWidth / 2) - 50;
      this.height = window.innerHeight - 150;
      this.isStacked = false;
    }    
  }

  private canExpand(nodeId: string): boolean {
    const matches = filter(this.typeaheadNodeList, (item) => item.id === nodeId);
    return (typeof matches !== 'undefined' && matches.length > 0);
  }
}

