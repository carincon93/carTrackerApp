import { Component } from '@angular/core'
import { NetworkService } from './services/network.service'

@Component({
	selector: 'app-root',
	templateUrl: 'app.component.html',
	styleUrls: ['app.component.scss'],
})
export class AppComponent {
	constructor(private networkService: NetworkService) {
		this.networkService
	}
}
