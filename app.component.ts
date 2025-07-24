import { Component } from '@angular/core';
import { Tree } from './tree';
import { SimpleTreeComponent } from './simple-tree.component';

@Component({
  selector: 'app-root',
  template: `
    <div class="app-container">
      <h1>Angular Material Tree with CRUD Operations</h1>
      
      <!-- Simple Tree Test -->
      <div class="test-section">
        <h2>Basic Tree Test</h2>
        <simple-tree></simple-tree>
      </div>
      
      <!-- Full CRUD Tree -->
      <div class="crud-section">
        <h2>Full CRUD Tree</h2>
        <p>This tree component supports full CRUD operations while maintaining perfect filter functionality:</p>
        <ul>
          <li><strong>Create:</strong> Add root nodes or child nodes using the action buttons</li>
          <li><strong>Read:</strong> View and expand/collapse nodes</li>
          <li><strong>Update:</strong> Rename nodes using the edit button</li>
          <li><strong>Delete:</strong> Remove nodes and their children using the delete button</li>
          <li><strong>Filter:</strong> Search through all nodes while preserving the tree structure</li>
        </ul>
        
        <tree-dynamic-example></tree-dynamic-example>
      </div>
    </div>
  `,
  styles: [`
    .app-container {
      padding: 20px;
      max-width: 1000px;
      margin: 0 auto;
    }
    
    h1 {
      color: #1976d2;
      text-align: center;
      margin-bottom: 30px;
    }
    
    h2 {
      color: #1976d2;
      margin-bottom: 15px;
    }
    
    .test-section {
      background: #f5f5f5;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 30px;
    }
    
    .crud-section {
      background: white;
      border: 1px solid #e0e0e0;
      padding: 20px;
      border-radius: 8px;
    }
    
    p {
      margin-bottom: 10px;
      color: #666;
    }
    
    ul {
      margin-bottom: 30px;
      color: #666;
    }
    
    li {
      margin-bottom: 5px;
    }
    
    strong {
      color: #1976d2;
    }
  `],
  standalone: true,
  imports: [Tree, SimpleTreeComponent]
})
export class AppComponent {
  title = 'Angular Material Tree with CRUD';
}