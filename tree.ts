import {CollectionViewer, SelectionChange, DataSource} from '@angular/cdk/collections';
import {FlatTreeControl} from '@angular/cdk/tree';
import {Component, Injectable} from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTreeModule } from '@angular/material/tree';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Inject } from '@angular/core';

import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormsModule } from '@angular/forms';
import {BehaviorSubject, merge, Observable} from 'rxjs';
import {map} from 'rxjs/operators';

// Interface for dialog data
export interface DialogData {
  title: string;
  label: string;
  value: string;
  action: string;
  placeholder: string;
}

export class DynamicFlatNode {
  constructor(
    public item: string,
    public level = 1,
    public expandable = false,
    public isLoading = false,
    public id?: string // Add unique identifier for CRUD operations
  ) {
    this.id = id || this.generateId();
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}


@Injectable({providedIn: 'root'})
export class DynamicDatabase {
  dataMap = new Map<string, string[]>([
    ['Fruits', ['Apple', 'Orange', 'Banana']],
    ['Vegetables', ['Tomato', 'Potato', 'Onion']],
    ['Apple', ['Fuji', 'Macintosh']],
    ['Onion', ['Yellow', 'White', 'Purple']],
  ]);

  rootLevelNodes: string[] = ['Fruits', 'Vegetables'];

  /** Initial data from database */
  initialData(): DynamicFlatNode[] {
    return this.rootLevelNodes.map(name => new DynamicFlatNode(name, 0, true));
  }

  getChildren(node: string): string[] | undefined {
    return this.dataMap.get(node);
  }

  isExpandable(node: string): boolean {
    return this.dataMap.has(node);
  }


//    * CRUD Operations

  // Create a new node
  createNode(parentItem: string | null, newNodeName: string): boolean {
    if (!newNodeName.trim()) {
      return false;
    }

    // Check if node already exists
    if (this.nodeExists(newNodeName)) {
      return false;
    }

    if (parentItem === null) {
      // Add as root level node - root nodes start as expandable with empty children
      this.rootLevelNodes.push(newNodeName);
      this.dataMap.set(newNodeName, []);
    } else {
      // Add as child of parent
      let children = this.dataMap.get(parentItem);
      if (!children) {
        // Parent was a leaf node, now it's becoming a parent
        children = [];
        this.dataMap.set(parentItem, children);
      }
      children.push(newNodeName);
      // DON'T initialize new child nodes in dataMap - they should be leaf nodes initially
      // Only add to dataMap when they actually get children
    }
    return true;
  }

  // Update/Rename a node
  updateNode(oldName: string, newName: string): boolean {
    if (!newName.trim() || oldName === newName) {
      return false;
    }

    // Check if new name already exists
    if (this.nodeExists(newName)) {
      return false;
    }

    // Update in dataMap
    const children = this.dataMap.get(oldName);
    if (children !== undefined) {
      this.dataMap.delete(oldName);
      this.dataMap.set(newName, children);
    }

    // Update in root level nodes
    const rootIndex = this.rootLevelNodes.indexOf(oldName);
    if (rootIndex !== -1) {
      this.rootLevelNodes[rootIndex] = newName;
    }

    // Update in parent's children arrays
    this.dataMap.forEach((childrenArray, parent) => {
      const childIndex = childrenArray.indexOf(oldName);
      if (childIndex !== -1) {
        childrenArray[childIndex] = newName;
      }
    });

    return true;
  }

  // Delete a node
  deleteNode(nodeName: string): boolean {
    // Remove from dataMap (this removes the node and all its children from being expandable)
    this.dataMap.delete(nodeName);

    // Remove from root level nodes
    const rootIndex = this.rootLevelNodes.indexOf(nodeName);
    if (rootIndex !== -1) {
      this.rootLevelNodes.splice(rootIndex, 1);
    }

    // Remove from parent's children arrays and check if parent should become a leaf
    this.dataMap.forEach((childrenArray, parent) => {
      const childIndex = childrenArray.indexOf(nodeName);
      if (childIndex !== -1) {
        childrenArray.splice(childIndex, 1);
        
        // If parent has no children left, remove it from dataMap (make it a leaf)
        // UNLESS it's a root node (root nodes should remain expandable even when empty)
        if (childrenArray.length === 0 && !this.rootLevelNodes.includes(parent)) {
          this.dataMap.delete(parent);
        }
      }
    });

    return true;
  }

  // Check if a node exists
  private nodeExists(nodeName: string): boolean {
    if (this.rootLevelNodes.includes(nodeName)) {
      return true;
    }
    
    for (const children of this.dataMap.values()) {
      if (children.includes(nodeName)) {
        return true;
      }
    }
    
    return false;
  }

  getAncestorPath(targetNode: string): string[] {
    const path: string[] = [];
    const findPathRecursive = (currentNodes: string[]): boolean => {
      for (const node of currentNodes) {
        path.push(node); // Add current node to path
        if (node === targetNode) {
          return true; // Found the target node
        }
        const children = this.getChildren(node);
        if (children && findPathRecursive(children)) {
          return true; // Found in children
        }
        path.pop(); // Backtrack if not found in this branch
      }
      return false;
    };

    // Start search from each root level node
    for (const root of this.rootLevelNodes) {
      // Clear path for each root attempt to ensure independent paths
      path.length = 0; // Efficiently clear array
      if (findPathRecursive([root])) {
        return path;
      }
    }
    return []; // Return empty if target node is not found in any path
  }

  getDescendants(node: string, descendants: Set<string> = new Set()): Set<string> {
    const children = this.getChildren(node);
    if (children) {
      for (const child of children) {
        descendants.add(child);
        this.getDescendants(child, descendants);
      }
    }
    return descendants;
  }

  // generate a flat list of all tree nodes with level and expandable state
  getAllNodes(): DynamicFlatNode[] {
    const allNodes: DynamicFlatNode[] = [];
    const buildNodes = (items: string[], level: number) => {
      for (const item of items) {
        // Always check current expandable state (important for nodes that become/stop being expandable)
        const expandable = this.isExpandable(item);
        allNodes.push(new DynamicFlatNode(item, level, expandable));
        const children = this.getChildren(item);
        if (children && children.length > 0) {
          buildNodes(children, level + 1);
        }
      }
    };
    buildNodes(this.rootLevelNodes, 0);
    return allNodes;
  }

  // Get parent of a node
  getParent(targetNode: string): string | null {
    for (const [parent, children] of this.dataMap.entries()) {
      if (children.includes(targetNode)) {
        return parent;
      }
    }
    return null;
  }
}

export class DynamicDataSource implements DataSource<DynamicFlatNode> {
  dataChange = new BehaviorSubject<DynamicFlatNode[]>([]);
  private _fullData: DynamicFlatNode[] = []; // Stores the complete, unfiltered data
  private _currentFilter: string = ''; // Store current filter to reapply after CRUD operations

  get data(): DynamicFlatNode[] {
    return this.dataChange.value;
  }
  set data(value: DynamicFlatNode[]) {
    this._treeControl.dataNodes = value;
    this.dataChange.next(value); // ENSURE next() IS ALWAYS CALLED WHEN data IS SET
  }

  constructor(
    private _treeControl: FlatTreeControl<DynamicFlatNode>,
    private _database: DynamicDatabase,
  ) {
    this.refreshData();
  }

  // Refresh data from database and reapply filter while preserving expansion state
  refreshData() {
    // Store currently expanded node items and current visible data
    const expandedItems = new Set<string>();
    this._treeControl.expansionModel.selected.forEach(node => {
      expandedItems.add(node.item);
    });

    // Clear expansion model to prevent conflicts during rebuild
    this._treeControl.expansionModel.clear();

    this._fullData = this._database.getAllNodes();
    
    if (this._currentFilter) {
      this.filter(this._currentFilter);
      // For filtered views, the filter method handles expansion
      return;
    }

    // If no nodes were expanded, just show initial data
    if (expandedItems.size === 0) {
      this.data = this._database.initialData();
      return;
    }

    // Restore expansion state immediately without setTimeout to prevent conflicts
    this.restoreExpansionState(expandedItems);
  }

  // Helper method to restore expansion state and rebuild the tree structure
  private restoreExpansionState(expandedItems: Set<string>) {
    if (expandedItems.size === 0) return;

    // Build the complete expanded tree structure
    const expandedData: DynamicFlatNode[] = [];
    const processedNodes = new Set<string>();
    const nodesToExpandInControl: DynamicFlatNode[] = [];

    // Helper function to add node and its children if expanded
    const addNodeWithChildren = (item: string, level: number) => {
      if (processedNodes.has(item)) return;
      processedNodes.add(item);

      const node = new DynamicFlatNode(item, level, this._database.isExpandable(item));
      expandedData.push(node);

      // Track nodes that should be expanded in the tree control
      if (expandedItems.has(item) && node.expandable) {
        nodesToExpandInControl.push(node);
      }

      // If this node was expanded, add its children
      if (expandedItems.has(item)) {
        const children = this._database.getChildren(item);
        if (children) {
          children.forEach(child => {
            addNodeWithChildren(child, level + 1);
          });
        }
      }
    };

    // Start with root level nodes
    this._database.rootLevelNodes.forEach(rootItem => {
      addNodeWithChildren(rootItem, 0);
    });

    // Update the data with the expanded structure
    this.data = expandedData;

    // Set the expansion state in the tree control
    // The expansion model is already cleared in refreshData()
    nodesToExpandInControl.forEach(node => {
      this._treeControl.expansionModel.select(node);
    });
  }

  connect(collectionViewer: CollectionViewer): Observable<DynamicFlatNode[]> {
    this._treeControl.expansionModel.changed.subscribe(change => {
      if (
        (change as SelectionChange<DynamicFlatNode>).added ||
        (change as SelectionChange<DynamicFlatNode>).removed
      ) {
        this.handleTreeControl(change as SelectionChange<DynamicFlatNode>);
      }
    });

    return merge(collectionViewer.viewChange, this.dataChange).pipe(map(() => this.data));
  }

  disconnect(collectionViewer: CollectionViewer): void {}

  /** Handle expand/collapse behaviors */
  handleTreeControl(change: SelectionChange<DynamicFlatNode>) {
    if (change.added) {
      change.added.forEach(node => this.toggleNode(node, true));
    }
    if (change.removed) {
      change.removed
        .slice()
        .reverse()
        .forEach(node => this.toggleNode(node, false));
    }
  }


//    * Toggle the node, remove from display list

  toggleNode(node: DynamicFlatNode, expand: boolean) {
    const childrenItems = this._database.getChildren(node.item);
    const index = this.data.indexOf(node);

    if (!childrenItems || index < 0) {
      return; // No children, or node not found in current data
    }

    node.isLoading = true;

    // Simulate async data loading
    setTimeout(() => {
      if (expand) {
        const newNodes = childrenItems.map(
          name => new DynamicFlatNode(name, node.level + 1, this._database.isExpandable(name)),
        );
        this.data.splice(index + 1, 0, ...newNodes);
      } else {
        let count = 0;
        for (
          let i = index + 1;
          i < this.data.length && this.data[i].level > node.level;
          i++, count++
        ) {}
        this.data.splice(index + 1, count);
      }

      // Important: Create a new array reference and use the setter to trigger change detection
      this.data = [...this.data]; // This calls the setter, which calls dataChange.next()
      node.isLoading = false;
    }, 200);
  }

  filter(filterText: string) {
    this._currentFilter = filterText; // Store current filter

    if (!filterText) {
      // If filter is empty, restore initial root data and collapse all
      this.data = this._database.initialData(); // This calls the setter, which calls dataChange.next()
      this._treeControl.collapseAll();
      return;
    }

    const lowerCaseFilter = filterText.toLowerCase();
    const relevantItems = new Set<string>(); // Stores only the ITEM STRINGS that need to be shown

    // 1. Identify all item strings that are relevant based on the filter
    this._fullData.forEach(node => {
      if (node.item.toLowerCase().includes(lowerCaseFilter)) {
        // If the node itself matches, include its ancestors and all its descendants
        const ancestors = this._database.getAncestorPath(node.item);
        ancestors.forEach(anc => relevantItems.add(anc));

        const descendants = this._database.getDescendants(node.item);
        descendants.forEach(desc => relevantItems.add(desc));
      }
    });

    const newData: DynamicFlatNode[] = [];
    const nodesToExpand: DynamicFlatNode[] = []; // Collect nodes to expand

    // 2. Build the new `data` array by filtering `_fullData`
    // This ensures correct order and no duplicates of DynamicFlatNode instances
    this._fullData.forEach(node => {
        if (relevantItems.has(node.item)) {
            newData.push(node);
            // If the node is an ancestor or the filtered node itself, it should be expanded
            // We need to be careful here: only expand if it's an expandable parent node in the filtered view
            if (node.expandable) { // Only add if it's potentially an expandable node
              const children = this._database.getChildren(node.item);
              // Check if any of its immediate children are present in the filtered view (relevantItems)
              // This indicates it should be expanded to reveal relevant children.
              if (children && children.some(child => relevantItems.has(child))) {
                nodesToExpand.push(node);
              }
            }
        }
    });

    // 3. Update the data source
    this.data = newData; // This calls the setter, which triggers dataChange.next()

    // 4. Expand the necessary nodes
    nodesToExpand.forEach(node => this._treeControl.expand(node));
  }

  // CRUD operations that maintain filter state
  createNode(parentItem: string | null, newNodeName: string): boolean {
    const success = this._database.createNode(parentItem, newNodeName);
    if (success) {
      this.refreshData();
    }
    return success;
  }

  updateNode(oldName: string, newName: string): boolean {
    const success = this._database.updateNode(oldName, newName);
    if (success) {
      this.refreshData();
    }
    return success;
  }

  deleteNode(nodeName: string): boolean {
    const success = this._database.deleteNode(nodeName);
    if (success) {
      this.refreshData();
    }
    return success;
  }
}

// Dialog Components
@Component({
  selector: 'node-dialog',
  template: `
    <h2 mat-dialog-title>{{data.title}}</h2>
    <mat-dialog-content>
      <mat-form-field class="full-width">
        <mat-label>{{data.label}}</mat-label>
        <input matInput [(ngModel)]="data.value" [placeholder]="data.placeholder">
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions>
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-button [mat-dialog-close]="data.value" cdkFocusInitial 
              [disabled]="!data.value?.trim()">{{data.action}}</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .full-width {
      width: 100%;
    }
  `],
  imports: [MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule, FormsModule]
})
export class NodeDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<NodeDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) {}

  onCancel(): void {
    this.dialogRef.close();
  }
}

@Component({
  selector: 'tree-dynamic-example',
  templateUrl: './tree.html',
  styleUrls: ['./tree.css'],
  imports: [MatFormFieldModule, MatIconModule,
    MatTreeModule, MatProgressBarModule, MatInputModule,
    MatButtonModule, MatTooltipModule, MatDialogModule
  ]
})
export class Tree { // Renamed from TreeDynamicExample to Tree as per your import
  constructor(
    private database: DynamicDatabase,
    private dialog: MatDialog
  ) {
    this.treeControl = new FlatTreeControl<DynamicFlatNode>(this.getLevel, this.isExpandable);
    this.dataSource = new DynamicDataSource(this.treeControl, database);
  }

  treeControl: FlatTreeControl<DynamicFlatNode>;
  dataSource: DynamicDataSource;

  getLevel = (node: DynamicFlatNode) => node.level;
  isExpandable = (node: DynamicFlatNode) => node.expandable;
  hasChild = (_: number, _nodeData: DynamicFlatNode) => _nodeData.expandable;

  applyFilter(filterText: string) {
    this.dataSource.filter(filterText.trim());
  }

  // CRUD Operations
  addRootNode() {
    this.openNodeDialog('Add Root Node', 'Node Name', '', 'Add', (result: string) => {
      if (result) {
        const success = this.dataSource.createNode(null, result);
        if (success) {
          this.showMessage(`Root node "${result}" added successfully!`);
        } else {
          this.showMessage(`Failed to add root node. Node "${result}" may already exist.`);
        }
      }
    });
  }

  addChildNode(parentNode: DynamicFlatNode) {
    this.openNodeDialog('Add Child Node', 'Node Name', '', 'Add', (result: string) => {
      if (result) {
        // Check if parent was a leaf node before adding child
        const wasLeafNode = !this.database.isExpandable(parentNode.item);
        
        const success = this.dataSource.createNode(parentNode.item, result);
        if (success) {
          this.showMessage(`Child node "${result}" added to "${parentNode.item}" successfully!`);
          
          // If the parent was a leaf node, we need to initialize it in dataMap
          if (wasLeafNode) {
            // The createNode method already added the child, so we just need to ensure
            // the parent is now in the dataMap (this happens automatically in createNode)
            // but we need to refresh the data to reflect the new expandable state
          }
          
          // Find the updated parent node in the refreshed data and expand it
          const updatedParentNode = this.dataSource.data.find(node => node.item === parentNode.item);
          if (updatedParentNode && updatedParentNode.expandable) {
            this.treeControl.expand(updatedParentNode);
          }
        } else {
          this.showMessage(`Failed to add child node. Node "${result}" may already exist.`);
        }
      }
    });
  }

  editNode(node: DynamicFlatNode) {
    this.openNodeDialog('Edit Node', 'Node Name', node.item, 'Update', (result: string) => {
      if (result && result !== node.item) {
        const success = this.dataSource.updateNode(node.item, result);
        if (success) {
          this.showMessage(`Node renamed from "${node.item}" to "${result}" successfully!`);
        } else {
          this.showMessage(`Failed to rename node. Node "${result}" may already exist.`);
        }
      }
    });
  }

  deleteNode(node: DynamicFlatNode) {
    if (confirm(`Are you sure you want to delete "${node.item}" and all its children?`)) {
      // Find the parent of the node being deleted
      const parentName = this.database.getParent(node.item);
      
      const success = this.dataSource.deleteNode(node.item);
      if (success) {
        this.showMessage(`Node "${node.item}" deleted successfully!`);
        
        // If the deleted node had a parent, check if parent should collapse
        if (parentName) {
          // Check if parent still has children after deletion
          const parentChildren = this.database.getChildren(parentName);
          if (!parentChildren || parentChildren.length === 0) {
            // Parent has no children left, find it in current data and collapse it
            const parentNode = this.dataSource.data.find(n => n.item === parentName);
            if (parentNode && this.treeControl.isExpanded(parentNode)) {
              this.treeControl.collapse(parentNode);
            }
          }
        }
      } else {
        this.showMessage(`Failed to delete node "${node.item}".`);
      }
    }
  }

  private openNodeDialog(title: string, label: string, value: string, action: string, callback: (result: string) => void) {
    const dialogRef = this.dialog.open(NodeDialogComponent, {
      width: '300px',
      data: { title, label, value, action, placeholder: 'Enter node name' } as DialogData
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        callback(result);
      }
    });
  }

  // optional only for showing message to after deletion and addition etc
  private showMessage(message: string) {
    console.log('Tree Operation:', message);
    
    // Create a simple toast notification without MatSnackBar
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #323232;
      color: white;
      padding: 12px 24px;
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      z-index: 10000;
      font-family: Roboto, sans-serif;
      font-size: 14px;
      max-width: 300px;
      transition: all 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
      toast.style.transform = 'translateX(0)';
      toast.style.opacity = '1';
    }, 10);
    
    // Remove after 3 seconds
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, 3000);
  }
}