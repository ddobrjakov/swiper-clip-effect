import Swiper from 'swiper/bundle'
import 'swiper/css/bundle'
import { default as EffectClip } from './effect-clip.js'
import { estimatedProgress } from './transitionProgress.js'

$(document).ready(function() {

	Swiper.use([ EffectClip ])

	const swiper = new Swiper('.swiper-container', {
		loop: true,
		speed: 1500,
		effect: 'clip',
		preventInteractionOnTransition: false,
		pagination: { el: '.swiper-pagination' },
		navigation: {
			nextEl: '.swiper-button-next',
			prevEl: '.swiper-button-prev'
		},
		autoplay: {
			delay: 500,
			waitForTransition: true	/** important (or just make sure delay > speed) */
		},
		on: {
			touchStart() {
				const swiper = this
				/** Stop any ongoing transition. */
				this.setProgress(estimatedProgress(swiper))
			},
			slideChange: onSlideChange
		}
	})

	setupAutoplay(swiper)

})

function setupAutoplay(swiper) {
	
	var touch = false
	swiper.on('touchStart', function() { touch = true })
	swiper.on('touchEnd', function() { touch = false; maybeStartAutoplay() })

	var hover = false
	$(swiper.wrapperEl).hover(
		function() { hover = true; swiper.autoplay.stop() }, 
		function() { hover = false; maybeStartAutoplay() }
	)

	const maybeStartAutoplay = () => { 
		if (!touch && !hover) swiper.autoplay.start() 
	}

}

function onSlideChange() {
	/** Do something when slide changes. */
}
