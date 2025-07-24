import { Component } from '@angular/core';
import { Tree } from './tree';

@Component({
  selector: 'simple-tree-test',
  template: `
    <div style="padding: 20px;">
      <h2>Tree Test</h2>
      <tree-dynamic-example></tree-dynamic-example>
    </div>
  `,
  standalone: true,
  imports: [Tree]
})
export class SimpleTreeTestComponent {}