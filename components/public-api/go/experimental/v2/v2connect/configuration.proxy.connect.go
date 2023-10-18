// Copyright (c) 2023 Gitpod GmbH. All rights reserved.
// Licensed under the GNU Affero General Public License (AGPL).
// See License.AGPL.txt in the project root for license information.

// Code generated by protoc-proxy-gen. DO NOT EDIT.

package v2connect

import (
	context "context"
	connect_go "github.com/bufbuild/connect-go"
	v2 "github.com/gitpod-io/gitpod/components/public-api/go/experimental/v2"
)

var _ ConfigurationServiceHandler = (*ProxyConfigurationServiceHandler)(nil)

type ProxyConfigurationServiceHandler struct {
	Client v2.ConfigurationServiceClient
	UnimplementedConfigurationServiceHandler
}

func (s *ProxyConfigurationServiceHandler) CreateConfiguration(ctx context.Context, req *connect_go.Request[v2.CreateConfigurationRequest]) (*connect_go.Response[v2.CreateConfigurationResponse], error) {
	resp, err := s.Client.CreateConfiguration(ctx, req.Msg)
	if err != nil {
		// TODO(milan): Convert to correct status code
		return nil, err
	}

	return connect_go.NewResponse(resp), nil
}

func (s *ProxyConfigurationServiceHandler) GetConfiguration(ctx context.Context, req *connect_go.Request[v2.GetConfigurationRequest]) (*connect_go.Response[v2.GetConfigurationResponse], error) {
	resp, err := s.Client.GetConfiguration(ctx, req.Msg)
	if err != nil {
		// TODO(milan): Convert to correct status code
		return nil, err
	}

	return connect_go.NewResponse(resp), nil
}

func (s *ProxyConfigurationServiceHandler) ListConfigurations(ctx context.Context, req *connect_go.Request[v2.ListConfigurationsRequest]) (*connect_go.Response[v2.ListConfigurationsResponse], error) {
	resp, err := s.Client.ListConfigurations(ctx, req.Msg)
	if err != nil {
		// TODO(milan): Convert to correct status code
		return nil, err
	}

	return connect_go.NewResponse(resp), nil
}

func (s *ProxyConfigurationServiceHandler) DeleteConfiguration(ctx context.Context, req *connect_go.Request[v2.DeleteConfigurationRequest]) (*connect_go.Response[v2.DeleteConfigurationResponse], error) {
	resp, err := s.Client.DeleteConfiguration(ctx, req.Msg)
	if err != nil {
		// TODO(milan): Convert to correct status code
		return nil, err
	}

	return connect_go.NewResponse(resp), nil
}