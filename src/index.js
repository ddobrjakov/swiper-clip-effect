import Swiper from 'swiper/bundle'
import 'swiper/css/bundle'
import { default as EffectClip } from './effect-clip.js'
import { estimatedProgress } from './transitionProgress.js'

$(document).ready(function() {

	Swiper.use([ EffectClip ])

	const swiper = new Swiper('.swiper-container', {
		loop: true,
		loopedSlides: 2,
		speed: 1500,
		effect: 'clip',
		preventInteractionOnTransition: false,
		pagination: { el: '.swiper-pagination' },
		navigation: {
			nextEl: '.swiper-button-next',
			prevEl: '.swiper-button-prev'
		},
		// autoplay: {
		// 	delay: 1000,
		// 	reverseDirection: true,
		// 	disableOnInteraction: false,
		// 	waitForTransition: true	/** important (or just make sure delay > speed) */
		// },
		on: {
			slideChange: onSlideChange,
			progress: function() {
				const bracketsForActive = (index, z) => index === this.activeIndex ? '['+z+']' : z
				console.log([...this.slides].map((slide, index) => bracketsForActive(index, $(slide).css('zIndex'))))
			}
		}
	})

	console.log('hello')

	enableTransitionPausing(swiper)
	// enableAutoplayOnHover(swiper)

})

function enableTransitionPausing(swiper) {
	swiper.on('touchStart', function() { this.setProgress(estimatedProgress(this)) })
	swiper.on('touchEnd', function() { this.slideToClosest(this.params.speed, false) })
}

function enableAutoplayOnHover(swiper) {
	var touch = false
	swiper.on('touchStart', function() { touch = true })
	swiper.on('touchEnd', function() { touch = false; maybeStartAutoplay() })
	
	var hover = false
	$(swiper.wrapperEl).hover(
		function() { hover = true; swiper.autoplay.stop() }, 
		function() { hover = false; maybeStartAutoplay() }
	)

	function maybeStartAutoplay() { 
		if (!touch && !hover) swiper.autoplay.start() 
	}
}

function onSlideChange() {
	/** Do something when slide changes. */
}
