import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule } from '@angular/forms';

// Angular Material Imports
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTreeModule } from '@angular/material/tree';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';

// Components
import { Tree, NodeDialogComponent } from './tree';

@NgModule({
  declarations: [],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    FormsModule,
    MatFormFieldModule,
    MatIconModule,
    MatProgressBarModule,
    MatTreeModule,
    MatInputModule,
    MatButtonModule,
    MatDialogModule,
    MatTooltipModule,
    // Import the standalone components
    Tree,
    NodeDialogComponent
  ],
  providers: [],
  bootstrap: []
})
export class AppModule { }

// Alternative: Use standalone components directly
import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  template: `
    <div style="padding: 20px;">
      <h1>Dynamic Tree Demo</h1>
      <tree-dynamic-example></tree-dynamic-example>
    </div>
  `,
  standalone: true,
  imports: [Tree]
})
export class AppComponent { }