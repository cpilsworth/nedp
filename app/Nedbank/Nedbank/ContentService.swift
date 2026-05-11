//
//  ContentService.swift
//  Nedbank
//
//  Loads PageDocument / ManifestDocument from the DA-SC endpoints.
//

import Foundation

nonisolated enum ContentError: Error, Sendable {
    case badResponse(Int)
    case decoding(any Error & Sendable)
    case transport(any Error & Sendable)
}

actor ContentService {
    static let shared = ContentService()

    private let session: URLSession = {
        let cfg = URLSessionConfiguration.default
        cfg.requestCachePolicy = .reloadRevalidatingCacheData
        return URLSession(configuration: cfg)
    }()

    /// Fetch a named page from the given environment. Switching environment
    /// hits a different upstream tier, so callers should treat env transitions
    /// as cache-invalidating and force a fresh fetch.
    func fetchPage(
        named pageId: String = "home",
        from environment: ContentEnvironment = .live
    ) async throws -> PageDocument {
        try await fetch(PageDocument.self, named: pageId, from: environment)
    }

    /// Fetch the manifest (list of available screens) for the given environment.
    func fetchManifest(from environment: ContentEnvironment = .live) async throws -> ManifestDocument {
        try await fetch(ManifestDocument.self, named: "manifest", from: environment)
    }

    private func fetch<T: Decodable & Sendable>(
        _ type: T.Type,
        named pageId: String,
        from environment: ContentEnvironment
    ) async throws -> T {
        let request = URLRequest(
            url: environment.url(forPage: pageId),
            cachePolicy: .reloadRevalidatingCacheData
        )
        let (data, response): (Data, URLResponse)
        do {
            (data, response) = try await session.data(for: request)
        } catch {
            throw ContentError.transport(error)
        }
        if let http = response as? HTTPURLResponse, !(200..<300).contains(http.statusCode) {
            throw ContentError.badResponse(http.statusCode)
        }
        do {
            return try JSONDecoder().decode(T.self, from: data)
        } catch {
            throw ContentError.decoding(error)
        }
    }
}
