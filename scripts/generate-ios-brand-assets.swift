import AppKit
import Foundation
import ImageIO
import UniformTypeIdentifiers

private let workspace = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
private let sourceLogoURL = workspace.appendingPathComponent("public/images/logo.png")
private let appIconURL = workspace.appendingPathComponent(
    "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png"
)
private let splashDirectory = workspace.appendingPathComponent(
    "ios/App/App/Assets.xcassets/Splash.imageset"
)

private func color(_ red: CGFloat, _ green: CGFloat, _ blue: CGFloat, _ alpha: CGFloat = 1) -> NSColor {
    NSColor(deviceRed: red / 255, green: green / 255, blue: blue / 255, alpha: alpha)
}

private func makeCanvas(size: Int, draw: (CGContext, CGFloat) -> Void) throws -> Data {
    let colorSpace = CGColorSpaceCreateDeviceRGB()
    guard let context = CGContext(
        data: nil,
        width: size,
        height: size,
        bitsPerComponent: 8,
        bytesPerRow: size * 4,
        space: colorSpace,
        bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue
    ) else {
        throw NSError(domain: "OperatingroomAssets", code: 1)
    }

    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(cgContext: context, flipped: false)
    draw(context, CGFloat(size))
    NSGraphicsContext.restoreGraphicsState()

    guard let image = context.makeImage() else {
        throw NSError(domain: "OperatingroomAssets", code: 2)
    }
    let data = NSMutableData()
    guard let destination = CGImageDestinationCreateWithData(
        data,
        UTType.png.identifier as CFString,
        1,
        nil
    ) else {
        throw NSError(domain: "OperatingroomAssets", code: 3)
    }
    CGImageDestinationAddImage(destination, image, nil)
    guard CGImageDestinationFinalize(destination) else {
        throw NSError(domain: "OperatingroomAssets", code: 4)
    }
    return data as Data
}

private func drawBackground(context: CGContext, size: CGFloat) {
    let space = CGColorSpaceCreateDeviceRGB()
    let baseColors = [
        color(5, 10, 31).cgColor,
        color(7, 24, 68).cgColor,
        color(12, 41, 91).cgColor,
    ] as CFArray
    let gradient = CGGradient(colorsSpace: space, colors: baseColors, locations: [0, 0.56, 1])!
    context.drawLinearGradient(
        gradient,
        start: CGPoint(x: size * 0.18, y: 0),
        end: CGPoint(x: size * 0.82, y: size),
        options: [.drawsBeforeStartLocation, .drawsAfterEndLocation]
    )

    let glowColors = [
        color(43, 128, 216, 0.30).cgColor,
        color(43, 128, 216, 0).cgColor,
    ] as CFArray
    let glow = CGGradient(colorsSpace: space, colors: glowColors, locations: [0, 1])!
    context.drawRadialGradient(
        glow,
        startCenter: CGPoint(x: size * 0.50, y: size * 0.62),
        startRadius: 0,
        endCenter: CGPoint(x: size * 0.50, y: size * 0.62),
        endRadius: size * 0.62,
        options: [.drawsAfterEndLocation]
    )
}

private func drawBrandMark(
    logo: NSImage,
    canvasSize: CGFloat,
    widthRatio: CGFloat,
    verticalOffset: CGFloat,
    glow: Bool = true
) {
    let aspect = logo.size.width / logo.size.height
    let width = canvasSize * widthRatio
    let height = width / aspect
    let frame = NSRect(
        x: (canvasSize - width) / 2,
        y: (canvasSize - height) / 2 + verticalOffset,
        width: width,
        height: height
    )

    NSGraphicsContext.saveGraphicsState()
    if glow {
        let shadow = NSShadow()
        shadow.shadowColor = color(84, 187, 255, 0.38)
        shadow.shadowBlurRadius = canvasSize * 0.035
        shadow.shadowOffset = .zero
        shadow.set()
    }
    logo.draw(in: frame, from: .zero, operation: .sourceOver, fraction: 1, respectFlipped: true, hints: [.interpolation: NSImageInterpolation.high])
    NSGraphicsContext.restoreGraphicsState()

    let pillWidth = canvasSize * 0.12
    let pillHeight = max(8, canvasSize * 0.014)
    let pill = NSBezierPath(
        roundedRect: NSRect(
            x: (canvasSize - pillWidth) / 2,
            y: frame.minY - canvasSize * 0.09,
            width: pillWidth,
            height: pillHeight
        ),
        xRadius: pillHeight / 2,
        yRadius: pillHeight / 2
    )
    color(255, 220, 31).setFill()
    pill.fill()
}

guard let logo = NSImage(contentsOf: sourceLogoURL) else {
    fputs("Unable to load brand mark at \(sourceLogoURL.path)\n", stderr)
    exit(1)
}

do {
    let appIcon = try makeCanvas(size: 1024) { context, size in
        drawBackground(context: context, size: size)
        drawBrandMark(logo: logo, canvasSize: size, widthRatio: 0.73, verticalOffset: size * 0.025)
    }
    try appIcon.write(to: appIconURL, options: .atomic)

    let splash = try makeCanvas(size: 2732) { context, size in
        context.setFillColor(color(7, 24, 63).cgColor)
        context.fill(CGRect(x: 0, y: 0, width: size, height: size))
        drawBrandMark(logo: logo, canvasSize: size, widthRatio: 0.34, verticalOffset: size * 0.035, glow: false)
    }
    for filename in ["splash-2732x2732.png", "splash-2732x2732-1.png", "splash-2732x2732-2.png"] {
        try splash.write(to: splashDirectory.appendingPathComponent(filename), options: .atomic)
    }

    print("Generated branded iOS icon and splash assets.")
} catch {
    fputs("Asset generation failed: \(error)\n", stderr)
    exit(1)
}
