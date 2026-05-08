import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AddExpense } from '../add-expense/add-expense';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule, AddExpense],
  templateUrl: './layout.html',
  styleUrl: './layout.scss',
})
export class Layout {}
