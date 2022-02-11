/*
	Hacky workaround to get swiper progress during transition.
	Implemented to let pause transitions.
*/

import Swiper from 'swiper/bundle'

/**
 * Parse boundaries of clip-path css property.
 * Accepts only properties defined as polygon with percentage values.
 * 
 * @example
 * ```js
 * // ['92.9199','0','100','0','100','100','92.9199','100']
 * parsePolygonClipPathCSS('polygon(92.9199% 0%, 100% 0%, 100% 100%, 92.9199% 100%)')
 * ```
 * @param {String} clipPathString CSS clip-path property value.
 * @returns {Array<String>} Array of 8 string values (2 boundaries for each corner).
 */
function parsePolygonClipPathCSS(clipPathString) {
	const r = String.raw
	// Regex string for floating number
	const numberRS = r`[+-]?(?:[0-9]*[.])?[0-9]+`
	// Regex string for polygon corner
	const cornerRS = r`(${numberRS})%\s(${numberRS})%`
	// Regex string for polygon arguments
	const argumentsRS = r`${cornerRS},\s${cornerRS},\s${cornerRS},\s${cornerRS}`
	// Complete regex expression
	const regex = new RegExp(r`polygon\(${argumentsRS}\)`)
	// Should return 8 matches (or null)
	return clipPathString.match(regex)
}

/**
 * Estimated transition progress based on clip-path property of target slide.
 * @param {Swiper} swiper Swiper instance.
 * @returns {Object} Slide transition progress (from 0 to 1).
 */
export function transitionProgress(swiper, targetIndex) {
	const targetSlide = $(swiper.slides[targetIndex])
	const clipPath = targetSlide.css('clipPath')
	const bounds = parsePolygonClipPathCSS(clipPath) || ['0','0','100','0','100','100','0','100']
	return Number(bounds[3]) / 100
}

/**
 * Calculate progress during transition. Uses CSS of transitioning slide.
 * This value differs from Swiper progress significantly during transitions.
 * @param {Swiper} swiper Swiper instance.
 * @returns {Number} Estimated progress (0 to 1).
 */
export function estimatedProgress(swiper) {
	/** Find candidates for transitioning slide.  */
	function targetIndexCandidates(swiper) {
		const isCandidate = slide => slide.progress >= 0 && slide.progress <= 1
		return [...swiper.slides].reduce((acc, slide, index) => isCandidate(slide) ? (acc.push(index), acc) : acc , [ ])
	}
	/** Estimate progress with known targetIndex (index of transitioning slide). */
	function estimateProgress(targetIndex) {
		const segment = 1 / (swiper.slides.length - 1)
		const sprogress = segment * targetIndex
		const tprogress = transitionProgress(swiper, targetIndex)
		/* By the end of transition, active slide must fit the wrapper. */
		return sprogress + (1 - tprogress) * segment
	}
	/** Tell if slide is in snap position. */
	function isSnapped(progress) {
		const segmentSize = 1 / (swiper.slides.length - 1)
		const segmentIndex = ~~(progress/segmentSize)
		const diff = progress - segmentIndex * segmentSize
		return (diff < 10e-6 || Math.abs(segmentSize - diff) < 10e-6)
	}
	const indexCandidates = targetIndexCandidates(swiper)
	const candidates = indexCandidates.map(targetIndex => ({ targetIndex, progress: estimateProgress(targetIndex) }))
	if (candidates.length > 2 || candidates.length === 0) return NaN
	if ((candidates.length === 1) || (Math.abs(candidates[0].progress - candidates[1].progress) < 10e-6)) return candidates[0].progress
	const transitioning = candidates.filter(({ progress }) => !isSnapped(progress))
	return (transitioning.length !== 1) ? NaN : transitioning[0].progress
}
