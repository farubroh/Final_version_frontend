import { Component, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common'; // ✅ fixes ngFor/ngIf

declare global {
  interface Window {
    HSSelect: any;
  }
}

@Component({
  selector: 'app-configuration',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './configuration.component.html',
  styleUrls: ['./configuration.component.css',]
})
export class ConfigurationComponent implements AfterViewInit {
  peopleList: { person: string, role: string }[] = [];

  ngAfterViewInit() {
    // Initialize Preline dropdowns after rendering
    setTimeout(() => {
      if (window.HSSelect) {
        window.HSSelect.autoInit();
      }
    }, 200); // Ensure it runs after Angular has initialized the component
  }

  addPerson() {
    const personSelect = document.querySelector<HTMLSelectElement>('[name="person"]');
    const roleSelect = document.querySelector<HTMLSelectElement>('[name="role"]');

    const selectedPerson = personSelect?.selectedOptions[0]?.textContent?.trim() || '';
    const selectedRole = roleSelect?.selectedOptions[0]?.textContent?.trim() || '';

    if (selectedPerson && selectedRole) {
      this.peopleList.push({ person: selectedPerson, role: selectedRole });

      // Reset selects visually
      personSelect!.selectedIndex = 0;
      roleSelect!.selectedIndex = 0;

      // Reinitialize the select dropdowns to reflect the changes
      setTimeout(() => {
        if (window.HSSelect) {
          window.HSSelect.autoInit();
        }
      }, 200);
    }
  }

  editPerson(index: number) {
    const current = this.peopleList[index];
    alert(`Edit feature: You can edit ${current.person} - ${current.role}`);
  }

  removePerson(index: number) {
    this.peopleList.splice(index, 1);
  }
}
