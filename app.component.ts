import { Component } from '@angular/core';
import { Tree } from './tree';

@Component({
  selector: 'app-root',
  template: `
    <div class="app-container">
      <h1>Angular Material Tree with CRUD Operations</h1>
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
      margin-bottom: 20px;
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
  imports: [Tree]
})
export class AppComponent {
  title = 'Angular Material Tree with CRUD';
}