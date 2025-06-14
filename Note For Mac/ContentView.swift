//
//  ContentView.swift
//  Note25
//
//  Created by Aidan Walford on 6/13/25.
//

import SwiftUI
import AppKit

class Note: Identifiable, ObservableObject, Equatable {
    static func == (lhs: Note, rhs: Note) -> Bool {
        lhs.id == rhs.id
    }

    let id = UUID()

    @Published var title: String
    @Published var content: NSAttributedString

    init(title: String, content: NSAttributedString) {
        self.title = title
        self.content = content
    }
}

struct ContentView: View {
    @StateObject private var noteStore = NoteStore()
    @State private var selectedNote: Note?

    var body: some View {
        NavigationSplitView {
            List(noteStore.notes, id: \.id, selection: $selectedNote) { note in
                NoteRowView(note: note, selectedNote: $selectedNote)
            }
            .frame(minWidth: 220)
            .padding()
            .background(.ultraThinMaterial)
            .cornerRadius(12)
            .navigationTitle("My Notes")
            .toolbar {
                Button(action: addNote) {
                    Label("New Note", systemImage: "plus")
                }
            }
        } detail: {
            if let note = selectedNote {
                VStack(spacing: 10) {
                    TextField("Title", text: Binding(
                        get: { note.title },
                        set: { note.title = $0 }
                    ))
                    .font(.title)
                    .padding(.horizontal)
                    .textFieldStyle(.roundedBorder)
                    .padding(.top)

                    ToolbarView(note: note)

                    RichTextEditor(attributedText: Binding(
                        get: { note.content },
                        set: { note.content = $0 }
                    ))
                    .padding()
                    .background(.ultraThinMaterial)
                    .cornerRadius(16)
                    .padding(.horizontal)
                    .frame(minHeight: 300)

                    Spacer()
                }
                .padding(.vertical)
            } else {
                Text("Select or create a note")
                    .foregroundColor(.secondary)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
        .onAppear {
            if selectedNote == nil {
                selectedNote = noteStore.notes.first
            }
        }
        .background(Color.black.opacity(0.9).ignoresSafeArea())
    }

    func addNote() {
        noteStore.addNote()
        selectedNote = noteStore.notes.last
    }
}

struct NoteRowView: View {
    let note: Note
    @Binding var selectedNote: Note?

    var body: some View {
        Text(note.title)
            .padding(6)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(
                RoundedRectangle(cornerRadius: 6)
                    .fill(selectedNote == note ? Color.blue.opacity(0.3) : Color.clear)
            )
            .foregroundColor(selectedNote == note ? .white : .primary)
            .onTapGesture {
                selectedNote = note
            }
    }
}

struct ToolbarView: View {
    @ObservedObject var note: Note

    var body: some View {
        HStack(spacing: 15) {
            Button(action: { toggleBold() }) {
                Image(systemName: "bold")
            }
            .help("Bold")

            Button(action: { toggleItalic() }) {
                Image(systemName: "italic")
            }
            .help("Italic")

            Button(action: { toggleUnderline() }) {
                Image(systemName: "underline")
            }
            .help("Underline")

            Spacer()
        }
        .padding(.horizontal)
        .font(.title3)
        .buttonStyle(.bordered)
        .tint(.blue)
    }

    private func toggleBold() {
        applyAttribute(.bold)
    }

    private func toggleItalic() {
        applyAttribute(.italic)
    }

    private func toggleUnderline() {
        applyAttribute(.underline)
    }

    private func applyAttribute(_ attribute: TextAttribute) {
        NotificationCenter.default.post(name: .applyTextAttribute, object: attribute)
    }
}

enum TextAttribute {
    case bold, italic, underline
}

struct RichTextEditor: NSViewRepresentable {
    @Binding var attributedText: NSAttributedString

    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }

    func makeNSView(context: Context) -> NSTextViewWrapper {
        let wrapper = NSTextViewWrapper()
        wrapper.textView.delegate = context.coordinator
        wrapper.textView.isRichText = true
        wrapper.textView.allowsUndo = true
        wrapper.textView.font = NSFont.systemFont(ofSize: 14)
        wrapper.textView.textStorage?.setAttributedString(attributedText)
        NotificationCenter.default.addObserver(forName: .applyTextAttribute, object: nil, queue: .main) { notification in
            if let attr = notification.object as? TextAttribute {
                wrapper.applyAttribute(attr)
            }
        }
        return wrapper
    }

    func updateNSView(_ nsView: NSTextViewWrapper, context: Context) {
        if nsView.textView.attributedString() != attributedText {
            nsView.textView.textStorage?.setAttributedString(attributedText)
        }
    }

    class Coordinator: NSObject, NSTextViewDelegate {
        var parent: RichTextEditor

        init(_ parent: RichTextEditor) {
            self.parent = parent
        }

        func textDidChange(_ notification: Notification) {
            guard let textView = notification.object as? NSTextView else { return }
            parent.attributedText = textView.attributedString()
        }
    }
}

class NSTextViewWrapper: NSView {
    let textView = NSTextView()

    override init(frame frameRect: NSRect) {
        super.init(frame: frameRect)

        let scrollView = NSScrollView(frame: frameRect)
        scrollView.hasVerticalScroller = true
        scrollView.documentView = textView
        scrollView.borderType = .noBorder

        textView.minSize = NSSize(width: 0, height: 0)
        textView.maxSize = NSSize(width: CGFloat.infinity, height: CGFloat.infinity)
        textView.isVerticallyResizable = true
        textView.isHorizontallyResizable = false
        textView.autoresizingMask = [.width]
        textView.textContainer?.containerSize = NSSize(width: frameRect.width, height: CGFloat.infinity)
        textView.textContainer?.widthTracksTextView = true

        addSubview(scrollView)
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func layout() {
        super.layout()
        subviews.first?.frame = bounds
    }

    func applyAttribute(_ attribute: TextAttribute) {
        guard let selectedRange = textView.selectedRanges.first as? NSRange else { return }
        guard selectedRange.length > 0 else { return }

        let mutable = NSMutableAttributedString(attributedString: textView.attributedString())

        switch attribute {
        case .bold:
            mutable.enumerateAttribute(.font, in: selectedRange, options: []) { value, range, _ in
                if let font = value as? NSFont {
                    let newFont = toggleTrait(font: font, trait: .boldFontMask)
                    mutable.addAttribute(.font, value: newFont, range: range)
                }
            }
        case .italic:
            mutable.enumerateAttribute(.font, in: selectedRange, options: []) { value, range, _ in
                if let font = value as? NSFont {
                    let newFont = toggleTrait(font: font, trait: .italicFontMask)
                    mutable.addAttribute(.font, value: newFont, range: range)
                }
            }
        case .underline:
            let existing = mutable.attribute(.underlineStyle, at: selectedRange.location, longestEffectiveRange: nil, in: selectedRange) as? Int ?? 0
            if existing == 0 {
                mutable.addAttribute(.underlineStyle, value: NSUnderlineStyle.single.rawValue, range: selectedRange)
            } else {
                mutable.removeAttribute(.underlineStyle, range: selectedRange)
            }
        }

        textView.textStorage?.setAttributedString(mutable)
        textView.setSelectedRange(selectedRange)
    }

    private func toggleTrait(font: NSFont, trait: NSFontTraitMask) -> NSFont {
        let manager = NSFontManager.shared
        if manager.traits(of: font).contains(trait) {
            return manager.convert(font, toNotHaveTrait: trait)
        } else {
            return manager.convert(font, toHaveTrait: trait)
        }
    }
}

extension Notification.Name {
    static let applyTextAttribute = Notification.Name("applyTextAttribute")
}

#Preview {
    ContentView()
}
