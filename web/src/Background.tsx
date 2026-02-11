import './Background.css'

export default function Background(): JSX.Element {
  return (
    <div className="animated-bg" aria-hidden="true">
      <div className="blobs">
        <span className="blob b1" />
        <span className="blob b2" />
        <span className="blob b3" />
        <span className="blob b4" />
      </div>
    </div>
  )
}
