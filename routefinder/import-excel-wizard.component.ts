import { Component, inject, Input } from '@angular/core';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
import { UploadFormComponent } from '../upload-form/upload-form.component';
import { UploadSheetsSettingComponent } from '../upload-sheets-setting/upload-sheets-setting.component';
import { NgClass, NgIf } from '@angular/common';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { AddressRoutesFormComponent } from '../address-routes-form/address-routes-form.component';

@Component({
  selector: 'app-import-wizard',
  standalone: true,
  imports: [
    NgbNavModule,
    NgClass,
    NgIf,
    UploadFormComponent,
    UploadSheetsSettingComponent,
    AddressRoutesFormComponent,
    AngularSvgIconModule,
  ],
  templateUrl: './import-excel-wizard.component.html',
  styleUrl: './import-excel-wizard.component.scss',
})
export class ImportExcelWizardComponent {
  activeModal = inject(NgbActiveModal);
  active = 1;
  importStep = 1; // Upload page two steps

  @Input() name: string | undefined;

  changeImportStep(value: number) {
    if (value === 3) {
      this.active = 2;
      this.importStep = 1;
    } else {
      this.importStep = value;
    }
  }
}
