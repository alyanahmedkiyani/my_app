# Angular Material Tree with CRUD Operations

A powerful Angular Material tree component that supports full CRUD (Create, Read, Update, Delete) operations while maintaining perfect filter functionality.

## Features

✅ **Complete CRUD Operations**
- **Create**: Add root nodes and child nodes
- **Read**: View and navigate tree structure
- **Update**: Rename existing nodes
- **Delete**: Remove nodes and their children

✅ **Advanced Filtering**
- Search through all nodes
- Automatic expansion of relevant parent nodes
- Filter preserves tree hierarchy
- Filter state maintained after CRUD operations

✅ **User Experience**
- Context menus for easy access to operations
- Modal dialogs for node creation/editing
- Toast notifications for operation feedback
- Confirmation dialogs for destructive actions

✅ **Responsive Design**
- Mobile-friendly interface
- Adaptive layout for different screen sizes
- Touch-friendly controls

## Usage

### Basic Implementation

```typescript
import { Tree } from './tree';

@Component({
  selector: 'app-root',
  template: '<tree-dynamic-example></tree-dynamic-example>',
  imports: [Tree]
})
export class AppComponent {}
```

### CRUD Operations

#### 1. Create Operations
- **Add Root Node**: Click the "Add Root Node" button
- **Add Child Node**: Right-click on any parent node and select "Add Child"

#### 2. Read Operations
- **Expand/Collapse**: Click the arrow icon next to parent nodes
- **View Structure**: All nodes are displayed in a hierarchical tree structure

#### 3. Update Operations
- **Rename Node**: Right-click on any node and select "Rename"
- Enter the new name in the dialog and click "Update"

#### 4. Delete Operations
- **Delete Node**: Right-click on any node and select "Delete"
- Confirm the deletion in the confirmation dialog
- **Note**: Deleting a parent node removes all its children

### Filter Functionality

The filter feature is robust and maintains tree structure:

```typescript
// Filter automatically:
// 1. Finds matching nodes
// 2. Includes all ancestors of matching nodes
// 3. Includes all descendants of matching nodes
// 4. Expands relevant parent nodes
// 5. Maintains filter state after CRUD operations
```

#### Filter Behavior:
- **Partial matches**: Supports partial string matching
- **Case insensitive**: Search is not case sensitive
- **Hierarchy preservation**: Shows complete path from root to filtered nodes
- **Auto-expansion**: Automatically expands nodes to show filtered results
- **State persistence**: Filter remains active after add/edit/delete operations

## Technical Implementation

### Key Components

1. **DynamicFlatNode**: Enhanced with unique identifiers for CRUD operations
2. **DynamicDatabase**: Extended with CRUD methods and validation
3. **DynamicDataSource**: Enhanced to maintain filter state during operations
4. **Tree Component**: Main component with CRUD operation handlers
5. **NodeDialogComponent**: Modal dialog for node creation/editing

### CRUD Methods

```typescript
// Database level CRUD operations
createNode(parentItem: string | null, newNodeName: string): boolean
updateNode(oldName: string, newName: string): boolean
deleteNode(nodeName: string): boolean

// Data source level operations (with filter preservation)
createNode(parentItem: string | null, newNodeName: string): boolean
updateNode(oldName: string, newName: string): boolean
deleteNode(nodeName: string): boolean
```

### Filter Implementation

The filter system works by:
1. Storing the current filter text
2. Refreshing data from the database after CRUD operations
3. Reapplying the stored filter automatically
4. Maintaining tree expansion state

```typescript
// Filter preservation after CRUD operations
refreshData() {
  this._fullData = this._database.getAllNodes();
  if (this._currentFilter) {
    this.filter(this._currentFilter);
  } else {
    this.data = this._database.initialData();
  }
}
```

## Dependencies

Required Angular Material modules:
- `MatTreeModule`
- `MatIconModule`
- `MatButtonModule`
- `MatFormFieldModule`
- `MatInputModule`
- `MatDialogModule`
- `MatSnackBarModule`
- `MatMenuModule`
- `MatProgressBarModule`
- `FormsModule` (for dialog inputs)

## Installation

1. Ensure Angular Material is installed in your project
2. Copy the `tree.ts`, `tree.html`, and `tree.css` files to your project
3. Import the `Tree` component in your module or component
4. Use the `<tree-dynamic-example>` selector in your template

## Customization

### Styling
The component uses CSS custom properties and can be easily customized:
- Modify colors in `tree.css`
- Adjust spacing and sizing
- Customize animations and transitions

### Data Structure
The tree uses a simple Map-based data structure that can be easily extended:
```typescript
dataMap = new Map<string, string[]>([
  ['Parent1', ['Child1', 'Child2']],
  ['Parent2', ['Child3', 'Child4']],
  // Add your data here
]);
```

### Validation
CRUD operations include built-in validation:
- Prevents duplicate node names
- Validates empty/whitespace-only names
- Handles edge cases gracefully

## Browser Support

Compatible with all modern browsers that support Angular Material and Angular 15+.

## License

This component is provided as-is for educational and commercial use.
