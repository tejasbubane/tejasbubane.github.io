--------------------------------------------------------------------------------
{-# LANGUAGE OverloadedStrings #-}
import           Data.Monoid (mappend)
import           Hakyll
import qualified Data.ByteString.Lazy.Char8 as C
import           Text.Jasmine
import Data.List (isSuffixOf)
import System.FilePath.Posix (takeBaseName,takeDirectory,(</>))
--------------------------------------------------------------------------------
-- | Create a JavaScript compiler that minifies the content
compressJsCompiler :: Compiler (Item String)
compressJsCompiler = do
  let minifyJS = C.unpack . minify . C.pack . itemBody
  s <- getResourceString
  return $ itemSetBody (minifyJS s) s

-- | Create a SCSS compiler that transpiles the SCSS to CSS and
-- minifies it (relying on the external 'sass' tool)
compressScssCompiler :: Compiler (Item String)
compressScssCompiler = do
  fmap (fmap compressCss) $
    getResourceString
    >>= withItemBody (unixFilter "sass" [ "--stdin"
                                        , "--no-source-map"
                                        , "--style=compressed"
                                        , "--load-path=css"
                                        ])

main :: IO ()
main = hakyll $ do
    match "images/*" $ do
        route   idRoute
        compile copyFileCompiler

    match "fonts/chancery/*" $ do
        route   idRoute
        compile copyFileCompiler

    match "fonts/iconfont/*" $ do
        route   idRoute
        compile copyFileCompiler

    match "js/*" $ do
        route   idRoute
        compile compressJsCompiler

    -- | Compile the SCSS, from 'scss/app.scss', to CSS and serve it as 'style.css'
    match "css/style.scss" $ do
        route   $ constRoute "app.css"
        compile compressScssCompiler

    match (fromList ["about.rst", "contact.markdown"]) $ do
        route   $ setExtension "html"
        compile $ pandocCompiler
            >>= loadAndApplyTemplate "templates/default.html" defaultContext
            >>= relativizeUrls
            >>= cleanIndexUrls

    -- Find all tags by meta info in posts/*
    -- and create corresponding files in tags/*
    tags <- buildTags "posts/*" (fromCapture "tags/*.html")

    tagsRules tags $ \tag pattern -> do
      let title = "Posts tagged \"" ++ tag ++ "\""
      route $ cleanRoute
      compile $ do
        posts <- recentFirst =<< loadAll pattern
        let ctx = constField "title" title
                  `mappend` listField "posts" postCtx (return posts)
                  `mappend` defaultContext

        makeItem ""
          >>= loadAndApplyTemplate "templates/tag.html" ctx
          >>= loadAndApplyTemplate "templates/default.html" ctx
          >>= relativizeUrls
          >>= cleanIndexUrls

    match "posts/*" $ do
        route $ cleanRoute
        compile $ pandocCompiler
            >>= saveSnapshot "content"
            >>= loadAndApplyTemplate "templates/post.html" (ctxWithTags postCtx tags)
            >>= loadAndApplyTemplate "templates/default.html" postCtx
            >>= relativizeUrls
            >>= cleanIndexUrls

    create ["archive.html"] $ do
        route cleanRoute
        compile $ do
            posts <- recentFirst =<< loadAll "posts/*"
            let archiveCtx =
                    listField "posts" postCtx (return posts) <>
                    constField "title" "Archives"            <>
                    defaultContext

            makeItem ""
                >>= loadAndApplyTemplate "templates/archive.html" archiveCtx
                >>= loadAndApplyTemplate "templates/default.html" archiveCtx
                >>= relativizeUrls
                >>= cleanIndexUrls

    match "index.html" $ do
        route $ idRoute
        compile $ do
            posts <- recentFirst =<< loadAllSnapshots "posts/*" "content"
            let indexCtx =
                    listField "posts" (ctxWithTags teaserCtx tags) (return $ take 5 posts) <>
                    constField "title" "Home" <>
                    defaultContext

            getResourceBody
                >>= applyAsTemplate indexCtx
                >>= loadAndApplyTemplate "templates/postitem.html" indexCtx
                >>= loadAndApplyTemplate "templates/default.html" indexCtx
                >>= relativizeUrls
                >>= cleanIndexUrls

    match "templates/*" $ compile templateBodyCompiler


--------------------------------------------------
-- Functions to modify post context (postCtx)
--------------------------------------------------
postCtx :: Context String
postCtx =
  dateField "date" "%B %e, %Y"                 <>
  modificationTimeField "modified" "%B %e, %Y" <>
  defaultContext

teaserCtx :: Context String
teaserCtx = teaserField "teaser" "content" <> postCtx

ctxWithTags :: Context String -> Tags -> Context String
ctxWithTags ctx tags = tagsField "tags" tags <> ctx

cleanRoute :: Routes
cleanRoute = customRoute createIndexRoute
  where
    createIndexRoute ident = takeDirectory p </> takeBaseName p </> "index.html"
      where p = toFilePath ident

cleanIndexUrls :: Item String -> Compiler (Item String)
cleanIndexUrls = return . fmap (withUrls cleanIndex)

cleanIndexHtmls :: Item String -> Compiler (Item String)
cleanIndexHtmls = return . fmap (replaceAll pattern replacement)
    where
      pattern = "/index.html"
      replacement = const "/"

cleanIndex :: String -> String
cleanIndex url
    | idx `isSuffixOf` url = take (length url - length idx) url
    | otherwise            = url
  where idx = "index.html"
