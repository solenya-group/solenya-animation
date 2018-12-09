# Solenya Animation

Solenya animation coordinates element animations in response to DOM changes.

For context, this package provides 1 of 3 techniques you can use to animate in Solenya:

1) CSS animation - this is great for animating an element when the previous position of the element or any of the element's siblings is irrelevant.
2) Web Animations API - this is great for sequencing animations on an element. The Web animations API is supported by most browsers and you can use the `web-animations-js` shim for the remaining browsers such as Internet Explorer. You can also use third party animation packages.
3) Measure/flip animations - this is what this package does - it lets you automatically animate the positions of elements in response to DOM changes. It does this using the measure/flip technique.

# transitionChildren

The `transitionChildren` function lets you gracefully transition the positions of a group of children as each enter, move, and leave the DOM.

It's used as follows:

```typescript
export class AnimateShuffle extends Component {
  @transient items = range(1, 101)

  view() {
    return div(
      button ({ onclick: () => this.shuffle() }, "shuffle"),
      div (transitionChildren(), this.items.map(n =>
        div ({ key: n }, n)))
    )
  }

  shuffle() {
    this.update(() => this.items = shuffle(this.items))
  }
}
```
Each child **must have a key** so the virtual DOM knows whether to add, remove, or update elements.

The properties are:

```typescript
export type Orientation = "horizontal"|"vertical"

interface TransitionChildrenProps {
    orientation: orientation
    duration?: number
}
```

# transitionChild

The `transitionChild` function lets you slide a single child element out while sliding a new child element in.

```typescript
div (transitionChild ({ orientation: "horizontal", direction: "forwards"}),
    div ({ key: elementKey}, ...)
)
```
The properties are:

```typescript
export type Orientation = "horizontal"|"vertical"
export type Direction = "forwards"|"backwards"

interface TransitionChildProps {
    orientation: Orientation
    direction: Direction
    duration?: number
    scrollToZero?: boolean
}
```
`transitionChild` can only be passed to an `VElement` that has **exactly 1 keyed child**. The key is crucial to let the virtual DOM know whether to merely update the element vs. remove and replace it. It's only when the element is replaced that the animation occurs.

Set `scrollToZero` to `true` when animating an element that represents a new page, as it's undesirable when the sliding stops to be scrolled part way into the new page.