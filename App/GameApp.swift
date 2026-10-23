import UIKit
import WebKit
import SwiftUI

@main
struct GameApp: App {
    var body: some Scene {
        WindowGroup {
            GameHost().ignoresSafeArea().statusBarHidden(true)
        }
    }
}

struct GameHost: UIViewControllerRepresentable {
    func makeUIViewController(context: Context) -> GameViewController { GameViewController() }
    func updateUIViewController(_ uiViewController: GameViewController, context: Context) {}
}

final class GameViewController: UIViewController, WKNavigationDelegate {
    private var webView: WKWebView!
    private let errorLabel = UILabel()

    override var supportedInterfaceOrientations: UIInterfaceOrientationMask { .landscape }
    override var preferredInterfaceOrientationForPresentation: UIInterfaceOrientation { .landscapeRight }
    override var prefersStatusBarHidden: Bool { true }
    override var prefersHomeIndicatorAutoHidden: Bool { true }

    override func viewDidLoad() {
        super.viewDidLoad()
        NotificationCenter.default.addObserver(self, selector: #selector(pauseGame),
                                               name: UIApplication.willResignActiveNotification, object: nil)
        view.backgroundColor = UIColor(red: 0.93, green: 0.95, blue: 0.94, alpha: 1)

        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .default()
        configuration.allowsInlineMediaPlayback = true
        configuration.preferences.javaScriptCanOpenWindowsAutomatically = false
        webView = WKWebView(frame: .zero, configuration: configuration)
        webView.translatesAutoresizingMaskIntoConstraints = false
        webView.navigationDelegate = self
        webView.isOpaque = false
        webView.backgroundColor = view.backgroundColor
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.scrollView.bounces = false
        view.addSubview(webView)
        NSLayoutConstraint.activate([
            webView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            webView.topAnchor.constraint(equalTo: view.topAnchor),
            webView.bottomAnchor.constraint(equalTo: view.bottomAnchor)
        ])

        errorLabel.translatesAutoresizingMaskIntoConstraints = false
        errorLabel.text = "The game could not load. Close and reopen the app to try again."
        errorLabel.textAlignment = .center
        errorLabel.numberOfLines = 0
        errorLabel.isHidden = true
        view.addSubview(errorLabel)
        NSLayoutConstraint.activate([
            errorLabel.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            errorLabel.centerYAnchor.constraint(equalTo: view.centerYAnchor),
            errorLabel.widthAnchor.constraint(lessThanOrEqualTo: view.widthAnchor, multiplier: 0.8)
        ])

        guard let url = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "Web") else {
            errorLabel.isHidden = false
            return
        }
        webView.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent())
    }

    @objc func pauseGame() {
        webView?.evaluateJavaScript("window.GameLifecycle?.pause();", completionHandler: nil)
    }

    #if DEBUG
    // CI drives the real interface; this path is absent from Release builds.
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        guard let argument = ProcessInfo.processInfo.arguments.first(where: { $0.hasPrefix("--capture-scene=") }),
              let scene = argument.split(separator: "=").last.map(String.init),
              ["menu", "batting", "competitions"].contains(scene) else { return }
        pollCapture(scene: scene, attempts: 180)
    }

    private func pollCapture(scene: String, attempts: Int) {
        guard attempts > 0 else { return }
        let script = """
        (() => {
          const $ = id => document.getElementById(id);
          if (!$('start') || $('start').disabled) return false;
          if (!window.__captureStarted) {
            window.__captureStarted = true;
            if ('\(scene)' === 'batting') {
              $('play-ball').click();
              $('team').value = 'coral-club';
              $('home-team').value = 'navy-stars';
              $('start').click();
            } else if ('\(scene)' === 'competitions') $('open-competitions').click();
          }
          if (!$('tutorial').hidden) $('tip-skip').click();
          const ready = '\(scene)' === 'batting' ? $('overlay').hidden :
            document.querySelector('.card').dataset.screen === ('\(scene)' === 'menu' ? 'home' : 'competitions');
          if (ready && !window.__captureReady) requestAnimationFrame(() => requestAnimationFrame(() => { window.__captureReady = true; }));
          return Boolean(ready && window.__captureReady);
        })()
        """
        webView.evaluateJavaScript(script) { [weak self] result, error in
            guard let self = self else { return }
            if error == nil, let ready = result as? Bool, ready {
                let file = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
                    .appendingPathComponent("capture-ready.txt")
                try? scene.write(to: file, atomically: true, encoding: .utf8)
            } else {
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) { [weak self] in
                    self?.pollCapture(scene: scene, attempts: attempts - 1)
                }
            }
        }
    }
    #endif

    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = navigationAction.request.url else {
            decisionHandler(.cancel)
            return
        }
        decisionHandler(url.isFileURL || url.absoluteString == "about:blank" ? .allow : .cancel)
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        errorLabel.isHidden = false
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        errorLabel.isHidden = false
    }

    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        webView.reload()
    }
}
