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
import { DragDropModule, CdkDragDrop, moveItemInArray, transferArrayItem, CdkDrag, CdkDropList } from '@angular/cdk/drag-drop';

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

  // Move node to a new parent (for drag and drop)
  moveNode(nodeToMove: string, newParent: string | null, newIndex?: number): boolean {
    // Don't allow moving a node to itself or its descendants
    if (nodeToMove === newParent) {
      return false;
    }
    
    // Check if newParent is a descendant of nodeToMove (would create a cycle)
    if (newParent) {
      const descendants = this.getDescendants(nodeToMove);
      if (descendants.has(newParent)) {
        return false;
      }
    }

    // Remove from current parent
    const currentParent = this.getParent(nodeToMove);
    if (currentParent) {
      const siblings = this.dataMap.get(currentParent);
      if (siblings) {
        const index = siblings.indexOf(nodeToMove);
        if (index !== -1) {
          siblings.splice(index, 1);
          
          // If parent has no children left and it's not a root node, remove it from dataMap
          if (siblings.length === 0 && !this.rootLevelNodes.includes(currentParent)) {
            this.dataMap.delete(currentParent);
          }
        }
      }
    } else {
      // Remove from root level
      const index = this.rootLevelNodes.indexOf(nodeToMove);
      if (index !== -1) {
        this.rootLevelNodes.splice(index, 1);
      }
    }

    // Add to new parent
    if (newParent === null) {
      // Moving to root level
      if (newIndex !== undefined && newIndex >= 0) {
        this.rootLevelNodes.splice(newIndex, 0, nodeToMove);
      } else {
        this.rootLevelNodes.push(nodeToMove);
      }
    } else {
      // Moving to a new parent
      let children = this.dataMap.get(newParent);
      if (!children) {
        children = [];
        this.dataMap.set(newParent, children);
      }
      
      if (newIndex !== undefined && newIndex >= 0) {
        children.splice(newIndex, 0, nodeToMove);
      } else {
        children.push(nodeToMove);
      }
    }

    return true;
  }
}

export class DynamicDataSource implements DataSource<DynamicFlatNode> {
  dataChange = new BehaviorSubject<DynamicFlatNode[]>([]);
  private _fullData: DynamicFlatNode[] = []; // Stores the complete, unfiltered data
  private _currentFilter: string = ''; // Store current filter to reapply after CRUD operations
  private _isRestoringState = false; // Flag to prevent toggleNode during restoration

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

    // Store current visible data structure to preserve exact state
    const currentVisibleItems = new Set<string>();
    this.data.forEach(node => currentVisibleItems.add(node.item));

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

    // Restore expansion state using the preserved structure
    this.restoreExpansionState(expandedItems, currentVisibleItems);
  }

  // Helper method to restore expansion state and rebuild the tree structure
  private restoreExpansionState(expandedItems: Set<string>, currentVisibleItems: Set<string>) {
    if (expandedItems.size === 0) return;

    // Set restoration flag to prevent toggleNode interference
    this._isRestoringState = true;

    // Temporarily disconnect the expansion model change listener to prevent toggleNode calls
    const currentSubscription = this._treeControl.expansionModel.changed;
    
    // Build the exact same tree structure that was visible before
    const restoredData: DynamicFlatNode[] = [];

    // Recreate the exact structure by checking what was previously visible
    const buildVisibleStructure = (items: string[], level: number) => {
      for (const item of items) {
        if (currentVisibleItems.has(item)) {
          const node = new DynamicFlatNode(item, level, this._database.isExpandable(item));
          restoredData.push(node);
          
          // If this item has children and they were visible, add them recursively
          const children = this._database.getChildren(item);
          if (children && children.length > 0) {
            buildVisibleStructure(children, level + 1);
          }
        }
      }
    };

    // Start with root level nodes
    buildVisibleStructure(this._database.rootLevelNodes, 0);

    // Clear expansion model completely to start fresh
    this._treeControl.expansionModel.clear();

    // Update the data with the restored structure
    this.data = restoredData;

    // Restore expansion state carefully
    setTimeout(() => {
      // Directly update the expansion model selection without triggering events
      restoredData.forEach(node => {
        if (expandedItems.has(node.item) && node.expandable) {
          // Check if this node has immediate children visible in the restored data
          const nodeIndex = restoredData.indexOf(node);
          const hasVisibleChildren = nodeIndex + 1 < restoredData.length && 
                                   restoredData[nodeIndex + 1].level === node.level + 1;
          
          if (hasVisibleChildren) {
            // Directly add to selection without triggering change events
            this._treeControl.expansionModel.select(node);
          }
        }
      });

      // Re-enable normal toggle behavior
      this._isRestoringState = false;
      
      // Force update the tree control data nodes
      this._treeControl.dataNodes = restoredData;
      
      // Trigger change detection
      this.dataChange.next([...this.data]);
    }, 100);
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
    // Don't handle changes during state restoration
    if (this._isRestoringState) {
      return;
    }

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
    // Prevent toggleNode during state restoration to avoid duplicates
    if (this._isRestoringState) {
      return;
    }

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
      // Special handling for create operations to ensure new nodes are visible
      this.refreshDataForCreate(parentItem, newNodeName);
    }
    return success;
  }

  updateNode(oldName: string, newName: string): boolean {
    const success = this._database.updateNode(oldName, newName);
    if (success) {
      // Special handling for update operations to preserve renamed nodes
      this.refreshDataForUpdate(oldName, newName);
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

  // Special refresh method for create operations
  private refreshDataForCreate(parentItem: string | null, newNodeName: string) {
    // Store currently expanded node items and current visible data
    const expandedItems = new Set<string>();
    this._treeControl.expansionModel.selected.forEach(node => {
      expandedItems.add(node.item);
    });

    // Store current visible data structure and add the new node to visible items
    const currentVisibleItems = new Set<string>();
    this.data.forEach(node => currentVisibleItems.add(node.item));
    
    // Add the new node to visible items if its parent is expanded
    if (parentItem === null || expandedItems.has(parentItem)) {
      currentVisibleItems.add(newNodeName);
    }

    this._fullData = this._database.getAllNodes();
    
    if (this._currentFilter) {
      this.filter(this._currentFilter);
      return;
    }

    // If no nodes were expanded, just show initial data
    if (expandedItems.size === 0) {
      this.data = this._database.initialData();
      return;
    }

    // Restore expansion state using the preserved structure
    this.restoreExpansionState(expandedItems, currentVisibleItems);
  }

  // Special refresh method for update operations
  private refreshDataForUpdate(oldName: string, newName: string) {
    // Store currently expanded node items and current visible data
    const expandedItems = new Set<string>();
    this._treeControl.expansionModel.selected.forEach(node => {
      expandedItems.add(node.item);
    });

    // Update expanded items to use new name if the renamed node was expanded
    if (expandedItems.has(oldName)) {
      expandedItems.delete(oldName);
      expandedItems.add(newName);
    }

    // Store current visible data structure and update with new name
    const currentVisibleItems = new Set<string>();
    this.data.forEach(node => currentVisibleItems.add(node.item));
    
    // Update visible items to use new name if the renamed node was visible
    if (currentVisibleItems.has(oldName)) {
      currentVisibleItems.delete(oldName);
      currentVisibleItems.add(newName);
    }

    this._fullData = this._database.getAllNodes();
    
    if (this._currentFilter) {
      this.filter(this._currentFilter);
      return;
    }

    // If no nodes were expanded, just show initial data
    if (expandedItems.size === 0) {
      this.data = this._database.initialData();
      return;
    }

         // Restore expansion state using the preserved structure
     this.restoreExpansionState(expandedItems, currentVisibleItems);
   }

   // Move node operation for drag and drop
   moveNode(nodeToMove: string, newParent: string | null, newIndex?: number): boolean {
     const success = this._database.moveNode(nodeToMove, newParent, newIndex);
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
    MatButtonModule, MatTooltipModule, MatDialogModule, DragDropModule
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

  // Drag and Drop functionality
  onDrop(event: CdkDragDrop<DynamicFlatNode[]>) {
    const draggedNode = event.item.data as DynamicFlatNode;
    
    // This handles reordering within the main tree container
    if (event.previousContainer === event.container) {
      // Get the target position information
      const draggedIndex = event.previousIndex;
      const targetIndex = event.currentIndex;
      
      if (draggedIndex === targetIndex) {
        return; // No change needed
      }
      
      // Find what nodes are at the drag and target positions
      const allNodes = this.dataSource.data;
      const targetNode = allNodes[targetIndex];
      
      if (targetNode) {
        // Determine the new parent based on the target position
        const newParent = this.determineNewParent(draggedNode, targetNode, targetIndex);
        
        if (this.canMove(draggedNode.item, newParent)) {
          const success = this.dataSource.moveNode(draggedNode.item, newParent);
          if (success) {
            this.showMessage(`Moved "${draggedNode.item}" ${newParent ? `under "${newParent}"` : 'to root level'}`);
          }
        } else {
          this.showMessage(`Cannot move "${draggedNode.item}" to that location`);
        }
      }
    }
  }

  // Determine the appropriate parent based on drop position
  private determineNewParent(draggedNode: DynamicFlatNode, targetNode: DynamicFlatNode, targetIndex: number): string | null {
    const allNodes = this.dataSource.data;
    
    // If dropping on a node at the same level, keep the same parent
    if (draggedNode.level === targetNode.level) {
      return this.database.getParent(targetNode.item);
    }
    
    // If dropping on a node at a higher level (less indented), use that node's parent
    if (targetNode.level < draggedNode.level) {
      return this.database.getParent(targetNode.item);
    }
    
    // If dropping on a node at a lower level (more indented), find the appropriate parent
    // Look backwards to find the parent at the appropriate level
    for (let i = targetIndex - 1; i >= 0; i--) {
      const potentialParent = allNodes[i];
      if (potentialParent.level === targetNode.level - 1) {
        return potentialParent.item;
      }
      if (potentialParent.level < targetNode.level - 1) {
        break;
      }
    }
    
    return null; // Root level
  }

  // Enhanced validation for moves
  canMove(draggedItem: string, newParent: string | null): boolean {
    // Don't allow moving to itself
    if (draggedItem === newParent) {
      return false;
    }
    
    // Don't allow moving a parent to its own descendant (would create a cycle)
    if (newParent) {
      const descendants = this.database.getDescendants(draggedItem);
      if (descendants.has(newParent)) {
        return false;
      }
    }
    
    return true;
  }

  // Drop a node onto another node (make it a child)
  dropOnNode(draggedNode: DynamicFlatNode, targetNode: DynamicFlatNode) {
    
    if (this.canMove(draggedNode.item, targetNode.item)) {
      const success = this.dataSource.moveNode(draggedNode.item, targetNode.item);
      if (success) {
        this.showMessage(`Moved "${draggedNode.item}" under "${targetNode.item}"`);
        
        // Expand the target node to show the new child
        setTimeout(() => {
          const updatedTargetNode = this.dataSource.data.find(node => node.item === targetNode.item);
          if (updatedTargetNode && updatedTargetNode.expandable) {
            this.treeControl.expand(updatedTargetNode);
          }
        }, 150);
      } else {
        this.showMessage(`Cannot move "${draggedNode.item}" under "${targetNode.item}"`);
      }
    } else {
      this.showMessage(`Cannot move "${draggedNode.item}" under "${targetNode.item}" - would create a cycle`);
    }
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
        
        // Store if parent was already expanded
        const wasExpanded = this.treeControl.isExpanded(parentNode);
        
        const success = this.dataSource.createNode(parentNode.item, result);
        if (success) {
          this.showMessage(`Child node "${result}" added to "${parentNode.item}" successfully!`);
          
          // If parent was previously a leaf node or wasn't expanded, expand it to show the new child
          setTimeout(() => {
            const updatedParentNode = this.dataSource.data.find(node => node.item === parentNode.item);
            if (updatedParentNode && updatedParentNode.expandable) {
              if (wasLeafNode || !wasExpanded) {
                // Expand the parent to show the new child
                this.treeControl.expand(updatedParentNode);
              }
            }
          }, 150);
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