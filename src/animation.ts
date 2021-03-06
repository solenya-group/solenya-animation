import { VLifecycle } from 'solenya'
import { forceRenderStyles } from "typestyle"

export type Orientation = "horizontal"|"vertical"
export type Direction = "forwards"|"backwards"
export type AnimationKind = "fade"|"slide"|"scale"

export const defaultDuration = 700

export interface TransitionChildrenProps {    

    /** The kind of animation - "fade" | "slide" | "scale". Defaults to "slide" if direction is specified, else "scale". */
    kind: AnimationKind

    /** Whether the children are oriented horiontally or vertically. Defaults to "vertical" */
    orientation: Orientation

    /** The duration of the animation */
    duration: number,

    /** Either "forwards" or "backwards" */
    direction: Direction

    /** Whether to reset the scroll position to zero. Useful for full page animations. */
    scrollToStart: boolean,

    /** The animation threshold in pixels. Defaults to 5. */
    animationThreshold: number,

    /** Whether width and height changes should be animated. Defaults to false. */
    isSizeAnimated: boolean
}

type CommonRect = DOMRect | ClientRect

type Change<T> = {
    before: T
    after: T
}

interface IPoint {x: number, y: number }

interface PseudoElement extends HTMLElement {    
    state_transitionChildren?: PseudoElement[]
    state_transitionScroll?: number
    state_prevBounds?: CommonRect
    state_transitionPositionStyle?: string | null
    removing?: boolean
    removingAnimationStarted?: boolean
}

export function transitionChildren (props: Partial<TransitionChildrenProps> = {}): VLifecycle
{
    const p = <TransitionChildrenProps> {
        ...props,
        kind: props.kind || (props.direction ? "slide" : "scale"),
        duration: props.duration || defaultDuration,
        orientation: props.orientation || "vertical",
        direction: props.direction || "forwards",
        animationThreshold: props.animationThreshold || 5,
        scrollToStart: props.scrollToStart || false,
        isSizeAnimated: props.isSizeAnimated || false
    }

    return {                       
        onBeforeUpdate (el: PseudoElement)
        {
            forceRenderStyles()            
            const children = el.state_transitionChildren = childElements (el)
            children.forEach (kid => {
                kid.state_prevBounds = kid.getBoundingClientRect()       
            })
            el.state_transitionScroll = p.orientation == "horizontal" ? document.documentElement.scrollLeft : document.documentElement.scrollTop           
        },
        onUpdated (el: PseudoElement)
        {    
            forceRenderStyles()

            const prevKids = el.state_transitionChildren!

            const stableKids = prevKids.filter (kid => kid.removing == null)                                    
            const inKids = childElements (el).filter(kid => prevKids.indexOf (kid) == -1)
            const outKids = prevKids.filter (kid => kid.removing == true)
           
            stableKids.forEach (kid => animateBoundsChange (kid, p))

            if (! inKids.length && ! outKids.length)
                return           

            const outSize = sum (outKids, c => size (c.state_prevBounds!, p.orientation))
            const inSize = sum (inKids, c => size (c.getBoundingClientRect(), p.orientation))
            const scrollPos = p.scrollToStart ? el.state_transitionScroll! : 0
            const scrollBy = p.kind != "slide" ? 0 : scrollPos + (p.direction == "forwards" ? -outSize : inSize)

            inKids.forEach (kid => {
                animateKind ({
                    element: kid,
                    transition: p,
                    fade: { before: 0, after: 1 },
                    slide: { before: -scrollBy, after: 0 },
                    scale: { before: 0, after: 1 }
                })       
            })
            
            outKids.forEach (kid =>
            {       
                if (kid.removingAnimationStarted)
                    return

                kid.removingAnimationStarted = true

                if (! el.state_transitionPositionStyle)
                    el.state_transitionPositionStyle = el.style.position
                
                el.style.position = "relative"
                kid.style.position = p.kind != "slide" || ! p.scrollToStart ? "absolute" : "fixed" // ie only works with fixed                             
                kid.style.left = "0px"
                kid.style.top = "0px"
                kid.style.width = kid.state_prevBounds!.width + "px"
                kid.style.height = kid.state_prevBounds!.height + "px"
                kid.style.opacity = "0" // prevents momentary flicker on ios
                el.insertBefore (kid, null)                
                var d = distanceToOrigin (getBoundsChange (kid))
                kid.style.left = `${-d.x}px` // note: must use left/top not translate cause of IE stuttering
                kid.style.top = `${-d.y}px`                                
                                
                const anim = animateKind ({
                    element: kid,
                    transition: p,
                    fade: { before: 1, after: 0 },
                    slide: { before: 0, after: scrollBy },
                    scale: { before: 1, after: 0 }
                })

                anim.onfinish = () => {
                    if (kid.parentElement)
                        kid.parentElement.removeChild (kid)
                    el.style.position = el.state_transitionPositionStyle!                    
                    el.state_transitionPositionStyle = undefined
                }
            })

            if (p.scrollToStart) 
                window.scrollTo (0,0) 
        }                    
    }
}

type AnimateKindProps = {
    element: PseudoElement
    transition: TransitionChildrenProps,
    fade: Change<number>
    scale: Change<number>
    slide: Change<number>
}

const animateKind = (props: AnimateKindProps) => {
    return props.element.animate (
        props.transition.kind == "scale" ? scaleAnimation (props.transition.orientation, props.scale, props.transition.direction, props.fade) :
        props.transition.kind == "slide" ? slideAnimation (props.transition.orientation, props.slide, props.fade) :
                                          fadeAnimation (props.fade),
        { duration: props.transition.duration, easing: "ease-out" }
    )
}

const distanceToOrigin = (r: Change<CommonRect>) => {
    return {
        x: r.after.left - r.before.left,
        y: r.after.top - r.before.top   
    }
}

const getBoundsChange = (el: PseudoElement) => <Change<CommonRect>>{
    before: el.state_prevBounds!,
    after: el.getBoundingClientRect()                    
}

export function animateBoundsChange (el: PseudoElement, props: TransitionChildrenProps)
{      
    const rect = getBoundsChange (el)
    const distance = distanceToOrigin (rect)
    const changes = [
        ...[distance.x, distance.y],
        ...! props.isSizeAnimated? [] : [rect.after.width - rect.before.width, rect.after.height - rect.before.height]
    ]

    if (! any (changes, v => Math.abs (v) > props.animationThreshold))
        return

    const transformKeyframes = <Keyframe[]> [
        { transform: `translate(${-distance.x}px,${-distance.y}px)` },
        { transform: `translate(0px,0px)` }
    ]

    const sizeKeyframes = <Keyframe[]> [
        { width: `${rect.before.width}px`, height: `${rect.before.height}px` },
        { width: `${rect.after.width}px`, height: `${rect.after.height}px` }
    ]

    const keyframes = ! props.isSizeAnimated ? transformKeyframes : [
        {...transformKeyframes[0], ...sizeKeyframes[0]},
        {...transformKeyframes[1], ...sizeKeyframes[1]}
    ]
    
    el.animate (keyframes, { duration: props.duration, easing: 'ease-out' })
}

export const size = (r: CommonRect, o: Orientation) =>
    o == "horizontal" ? r.width : r.height

export const start = (r: CommonRect, o: Orientation) =>
    o == "horizontal" ? r.left : r.top

export const startOfPoint = (p: IPoint, o: Orientation) =>
    o == "horizontal" ? p.x : p.y

export const getTranslate = (n: number, o: Orientation) =>
    `translate${o == "horizontal" ? "X" : "Y"}(${n}px)`

export const getScale = (n: number, o: Orientation) =>
    `scale${o == "horizontal" ? "X" : "Y"}(${n})`

export const getOrigin = (n: number, o: Orientation, direction: Direction) => {
    const d = direction == "forwards" ? 0 : 1
    return o == "horizontal" ? `${n*d*100}% 0px` : `0px ${n*d*100}%`
}

export const childElements = (el: Element) =>
    Array.from(el.childNodes).map(c => c as PseudoElement)

export const scaleAnimation = (o: Orientation, scale: Change<number>, direction: Direction, opacity: Change<number>) => <Keyframe[]> [
    { opacity: ""+opacity.before, transformOrigin: getOrigin (scale.before, o, direction), transform: getScale (scale.before, o)},
    { opacity: ""+opacity.after, transformOrigin: getOrigin (scale.before, o, direction), transform: getScale (scale.after, o) }
]

export const slideAnimation = (o: Orientation, translate: Change<number>, opacity: Change<number>) => <Keyframe[]> [
     { opacity: ""+opacity.before, transform: getTranslate (translate.before, o) },
     { opacity: ""+opacity.after, transform: getTranslate (translate.after, o) }
]

export const fadeAnimation = (opacity: Change<number>) => <Keyframe[]> [
     { opacity: ""+opacity.before },
     { opacity: ""+0 },
     { opacity: ""+opacity.after }
]

const sum = function <T>(source: T[], mapper: (val: T) => number) {
    var total = 0
    for (var x of source)
        total += mapper(x)
    return total
}

const any = function <T>(source: T[], filter: (val: T) => boolean) {
    for (var x of source)
        if (filter (x))
            return true
    return false
}