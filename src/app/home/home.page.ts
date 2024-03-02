import { Component } from '@angular/core'
import * as L from 'leaflet'
import { AngularFireAuth } from '@angular/fire/compat/auth'
import { AngularFirestore, AngularFirestoreCollection } from '@angular/fire/compat/firestore'
import { Geolocation } from '@capacitor/geolocation'
import { BehaviorSubject, Observable } from 'rxjs'
import { map } from 'rxjs/operators'
import { Network } from '@capacitor/network'
import { FormControl, FormGroup } from '@angular/forms'
import { Clipboard } from '@capacitor/clipboard'
import { Toast } from '@capacitor/toast'

const showToast = async (msg) => {
	await Toast.show({
		text: `${msg}`,
	})
}

@Component({
	selector: 'app-home',
	templateUrl: 'home.page.html',
	styleUrls: ['home.page.scss'],
})
export class HomePage {
	time: BehaviorSubject<string> = new BehaviorSubject('00:03')
	timer: number
	interval

	map: L.Map
	markers = []
	isTracking = false
	disabledButton = false
	watch: any
	car = null
	// Firebase Data
	locations: Observable<any>
	locationsCollection: AngularFirestoreCollection<any>

	private formData: FormGroup

	constructor(private afAuth: AngularFireAuth, private afs: AngularFirestore) {}

	anonLogin() {
		this.afAuth.signInAnonymously().then((res) => {
			this.car = res.user

			this.getAllLocations(this.car.uid)
		})
	}

	writeToClipboard = async (caruid) => {
		await Clipboard.write({
			string: `${caruid}`,
		})
		showToast('Copied')
	}

	startTimer(duration: number) {
		clearInterval(this.interval)
		this.timer = duration * 60
		this.updateTimeValue()
		this.interval = setInterval(() => {
			this.updateTimeValue()
		}, 1000)
	}

	stopTimer() {
		clearInterval(this.interval)
		this.time.next('00:03')
	}

	updateTimeValue() {
		let minutes: any = this.timer / 60
		let seconds: any = this.timer % 60

		minutes = String('0' + Math.floor(minutes)).slice(-2)
		seconds = String('0' + Math.floor(seconds)).slice(-2)

		const text = minutes + ':' + seconds
		this.time.next(text)

		--this.timer

		if (this.timer < 0) {
			this.startTimer(0.05)
		}
	}

	getAllLocations(caruid) {
		this.locationsCollection = this.afs.collection(`locations/${caruid}/track`, (ref) => ref.orderBy('timestamp'))

		// Make sure we also get the Firebase item ID!
		this.locations = this.locationsCollection.snapshotChanges().pipe(
			map((actions) =>
				actions.map((a) => {
					const data = a.payload.doc.data()
					const id = a.payload.doc.id
					return { id, ...data }
				}),
			),
		)

		// Update Map marker on every change
		this.locations.subscribe((locations) => {
			this.updateMap(locations)
		})
	}

	ngOnInit() {
		this.map = L.map('map', {
			center: [5.0675333, -75.4895473],
			zoom: 15,
			renderer: L.canvas(),
		})

		L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
			// maxZoom: 12,
			attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
		}).addTo(this.map)

		setTimeout(() => {
			this.map.invalidateSize()
		}, 0)

		this.formData = new FormGroup({
			uid: new FormControl(),
		})
	}

	onSubmit() {
		this.markers.map((marker) => {
			this.map.removeLayer(marker)
		})

		this.markers = []

		if (this.formData.value.uid) {
			this.getAllLocations(this.formData.value.uid)
			showToast(`You are now tracking Car ID: ${this.formData.value.uid}`)
		} else {
			showToast('Please enter a valid Car ID')
		}
	}

	/** Remove map when we have multiple map object */
	ngOnDestroy() {
		this.map.remove()
	}

	async networStatus() {
		return await Network.getStatus()
	}

	// Use Capacitor to track our geolocation
	async startTracking() {
		if (this.isTracking == false) {
			this.clearTracking()
		}

		this.disabledButton = true
		this.startTimer(0.05)

		setTimeout(async () => {
			this.isTracking = true
			this.watch = await Geolocation.watchPosition({}, (position, err) => {
				if (position) {
					this.addNewLocation(position.coords.latitude, position.coords.longitude, position.timestamp)
				}
			})
			this.disabledButton = false
		}, 3000)
	}

	// Unsubscribe from the geolocation watch using the initial ID
	async stopTracking() {
		this.stopTimer()
		if (this.watch != null) {
			Geolocation.clearWatch({ id: this.watch }).then(() => {
				this.isTracking = false
				this.disabledButton = false
			})
		}
	}

	clearTracking() {
		this.locationsCollection.ref.get().then((item) => {
			item.docs.map((doc) => {
				doc.ref.delete()
			})
		})
		setTimeout(() => {
			this.markers.map((marker) => {
				this.map.removeLayer(marker)
			})
		}, 1000)
		setTimeout(() => {
			this.markers = []
		}, 2000)
	}

	// Save a new location to Firebase and center the map
	addNewLocation(lat, lng, timestamp) {
		if (this.isTracking) {
			this.locationsCollection.add({
				lat,
				lng,
				timestamp,
			})
		}
	}

	// Redraw all markers on the map
	updateMap(locations) {
		for (let loc of locations) {
			let marker = new L.marker([loc.lat, loc.lng]).addTo(this.map)

			this.markers.push(marker)
		}
	}
}
