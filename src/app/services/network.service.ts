import { Injectable } from '@angular/core'
import { Network } from '@capacitor/network'
import { Toast } from '@capacitor/toast'
import { Platform } from '@ionic/angular'
import { BehaviorSubject, Observable } from 'rxjs'

export enum ConnectionStatus {
	Online,
	Offline,
}

const showToast = async (msg) => {
	await Toast.show({
		text: `${msg}`,
	})
}

@Injectable({
	providedIn: 'root',
})
export class NetworkService {
	public status: BehaviorSubject<ConnectionStatus> = new BehaviorSubject(ConnectionStatus.Offline)

	constructor(private plt: Platform) {
		this.plt.ready().then(() => {
			Network.addListener('networkStatusChange', (status) => {
				let connectionStatus = status.connectionType !== 'none' ? ConnectionStatus.Online : ConnectionStatus.Offline
				this.status.next(connectionStatus)
				this.initializeNetworkEvents()
			})
		})
	}

	public initializeNetworkEvents() {
		if (this.status.value === ConnectionStatus.Online) {
			this.updateNetworkStatus(ConnectionStatus.Online)
		} else if (this.status.value === ConnectionStatus.Offline) {
			this.updateNetworkStatus(ConnectionStatus.Offline)
		}
	}

	private async updateNetworkStatus(status: ConnectionStatus) {
		this.status.next(status)

		let connection = status == ConnectionStatus.Offline ? 'offline' : 'online'
		showToast(`You are now ${connection}`)
	}

	public onNetworkChange(): Observable<ConnectionStatus> {
		return this.status.asObservable()
	}

	public getCurrentNetworkStatus(): ConnectionStatus {
		return this.status.getValue()
	}
}
