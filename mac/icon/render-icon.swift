// Renders the Run My Agents app icon (1024x1024 PNG). Usage: render-icon <out.png>
import AppKit
let S: CGFloat = 1024
let cs = CGColorSpaceCreateDeviceRGB()
let ctx = CGContext(data: nil, width: Int(S), height: Int(S), bitsPerComponent: 8, bytesPerRow: 0, space: cs, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
ctx.translateBy(x: 0, y: S); ctx.scaleBy(x: 1, y: -1) // SVG-style top-left origin
func c(_ hex: UInt32, _ a: CGFloat = 1) -> CGColor { CGColor(red: CGFloat((hex>>16)&255)/255, green: CGFloat((hex>>8)&255)/255, blue: CGFloat(hex&255)/255, alpha: a) }
// background squircle-ish rounded square with 10% inset (macOS grid)
let inset: CGFloat = 100, side = S - 2*inset
let bg = CGPath(roundedRect: CGRect(x: inset, y: inset, width: side, height: side), cornerWidth: side*0.22, cornerHeight: side*0.22, transform: nil)
ctx.saveGState(); ctx.setShadow(offset: CGSize(width: 0, height: 12), blur: 30, color: c(0, 0.5)); ctx.addPath(bg); ctx.setFillColor(c(0x0b0b12)); ctx.fillPath(); ctx.restoreGState()
ctx.saveGState(); ctx.addPath(bg); ctx.clip()
ctx.drawLinearGradient(CGGradient(colorsSpace: cs, colors: [c(0x1c1c2b), c(0x0b0b12)] as CFArray, locations: [0,1])!, start: CGPoint(x: S/2, y: inset), end: CGPoint(x: S/2, y: S-inset), options: [])
ctx.restoreGState()
// blob in 64-unit space, scaled to ~66% of tile
let k = side*0.70/64, ox = (S - 64*k)/2, oy = (S - 64*k)/2 + 10
func p(_ x: CGFloat, _ y: CGFloat) -> CGPoint { CGPoint(x: ox + x*k, y: oy + y*k) }
let blob = CGMutablePath()
blob.move(to: p(32,4))
blob.addCurve(to: p(59,30), control1: p(46,4), control2: p(60,12))
blob.addCurve(to: p(32,60), control1: p(58,48), control2: p(50,60))
blob.addCurve(to: p(5,30), control1: p(14,60), control2: p(4,50))
blob.addCurve(to: p(32,4), control1: p(6,10), control2: p(18,4))
blob.closeSubpath()
ctx.saveGState(); ctx.setShadow(offset: CGSize(width: 0, height: 24), blur: 40, color: c(0xf472b6, 0.35)); ctx.addPath(blob); ctx.setFillColor(c(0xf472b6)); ctx.fillPath(); ctx.restoreGState()
ctx.saveGState(); ctx.addPath(blob); ctx.clip()
ctx.drawRadialGradient(CGGradient(colorsSpace: cs, colors: [c(0xffd6ec), c(0xf472b6), c(0xbe185d)] as CFArray, locations: [0, 0.45, 1])!, startCenter: p(22,16), startRadius: 0, endCenter: p(30,28), endRadius: 40*k, options: [.drawsAfterEndLocation])
ctx.restoreGState()
for ex in [22.0, 42.0] as [CGFloat] {
  let e = CGRect(x: ox + (ex-6)*k, y: oy + (30-9)*k, width: 12*k, height: 18*k)
  ctx.setFillColor(c(0xffffff)); ctx.fillEllipse(in: e)
  ctx.setFillColor(c(0x0b0b12)); ctx.fillEllipse(in: CGRect(x: ox + (ex-2.5)*k, y: oy + (32-4)*k, width: 6*k, height: 9*k))
  ctx.setFillColor(c(0xffffff, 0.9)); ctx.fillEllipse(in: CGRect(x: ox + (ex-1)*k, y: oy + 29*k, width: 2.2*k, height: 2.2*k))
}
let img = ctx.makeImage()!
let rep = NSBitmapImageRep(cgImage: img)
try! rep.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: CommandLine.arguments[1]))
