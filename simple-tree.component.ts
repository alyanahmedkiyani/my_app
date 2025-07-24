import { Component, Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { FlatTreeControl } from '@angular/cdk/tree';
import { MatTreeModule, MatTreeFlatDataSource } from '@angular/material/tree';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

interface FoodNode {
  name: string;
  children?: FoodNode[];
}

interface ExampleFlatNode {
  expandable: boolean;
  name: string;
  level: number;
}

const TREE_DATA: FoodNode[] = [
  {
    name: 'Fruit',
    children: [
      {name: 'Apple'},
      {name: 'Banana'},
      {name: 'Orange'}
    ]
  },
  {
    name: 'Vegetables',
    children: [
      {name: 'Carrot'},
      {name: 'Lettuce'},
      {name: 'Tomato'}
    ]
  }
];

@Component({
  selector: 'simple-tree',
  template: `
    <div style="padding: 20px;">
      <h3>Simple Tree Test</h3>
      <p>Tree has {{treeControl.dataNodes.length}} nodes</p>
      
      <mat-tree [dataSource]="dataSource" [treeControl]="treeControl">
        <!-- Leaf node -->
        <mat-tree-node *matTreeNodeDef="let node" matTreeNodePadding>
          <button mat-icon-button disabled></button>
          {{node.name}}
          <button mat-icon-button>
            <mat-icon>edit</mat-icon>
          </button>
        </mat-tree-node>
        
        <!-- Parent node -->
        <mat-tree-node *matTreeNodeDef="let node; when: hasChild" matTreeNodePadding>
          <button mat-icon-button matTreeNodeToggle [attr.aria-label]="'Toggle ' + node.name">
            <mat-icon class="mat-icon-rtl-mirror">
              {{treeControl.isExpanded(node) ? 'expand_more' : 'chevron_right'}}
            </mat-icon>
          </button>
          {{node.name}}
          <button mat-icon-button>
            <mat-icon>add</mat-icon>
          </button>
        </mat-tree-node>
      </mat-tree>
    </div>
  `,
  standalone: true,
  imports: [MatTreeModule, MatIconModule, MatButtonModule]
})
export class SimpleTreeComponent {
  private _transformer = (node: FoodNode, level: number) => {
    return {
      expandable: !!node.children && node.children.length > 0,
      name: node.name,
      level: level,
    };
  };

  treeControl = new FlatTreeControl<ExampleFlatNode>(
    node => node.level,
    node => node.expandable
  );

  dataSource = new MatTreeFlatDataSource(this.treeControl, this._transformer);

  constructor() {
    this.dataSource.data = TREE_DATA;
  }

  hasChild = (_: number, node: ExampleFlatNode) => node.expandable;
}